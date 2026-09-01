import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/Buttons';
import { Text } from '@/components/Text';
import { colors, radii, screenPadding, spacing } from '@/constants/theme';
import { useApp } from '@/hooks/useAppState';

/**
 * Full-screen capture for a task's proof photo. Deliberately bare — a
 * viewfinder, a shutter, and the two controls worth having on it — because it
 * opens mid-task and closes again as soon as the shot is taken.
 */
export default function TaskCameraScreen() {
  const router = useRouter();
  const { taskId, day, target } = useLocalSearchParams<{
    taskId?: string;
    day?: string;
    /** `avatar` shoots for the profile circle instead of a task. */
    target?: string;
  }>();
  const { setTaskPhoto, setAvatarPhoto } = useApp();

  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [busy, setBusy] = useState(false);
  const insets = useSafeAreaInsets();

  const capture = async () => {
    // The shutter stays pressable while the file is being written, and a
    // second shot mid-write loses the first.
    if (busy) return;
    setBusy(true);
    try {
      const shot = await camera.current?.takePictureAsync({ quality: 0.8 });
      if (shot?.uri) {
        if (target === 'avatar') {
          setAvatarPhoto({ uri: shot.uri });
        } else if (taskId) {
          setTaskPhoto(taskId, { uri: shot.uri }, Number(day));
        }
        router.back();
        return;
      }
    } catch {
      /* Nothing usable came back; leave the viewfinder up to try again. */
    }
    setBusy(false);
  };

  if (!permission?.granted) {
    return (
      <View style={[styles.gate, { paddingTop: insets.top + spacing['5xl'] }]}>
        <Text variant="sectionTitle" center>
          Camera access
        </Text>
        <Text variant="body" color={colors.inkSoft} center style={styles.blurb}>
          Her 75 needs the camera to photograph today&apos;s tasks.
        </Text>
        <PrimaryButton
          label={permission?.canAskAgain === false ? 'Close' : 'Allow camera'}
          onPress={
            permission?.canAskAgain === false
              ? () => router.back()
              : () => requestPermission()
          }
          style={styles.gateAction}
        />
        {permission?.canAskAgain === false ? null : (
          <Pressable onPress={() => router.back()} style={styles.gateCancel}>
            <Text variant="button" color={colors.inkMuted}>
              Not now
            </Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView ref={camera} facing="back" flash={flash} style={StyleSheet.absoluteFill} />

      <View style={[styles.topRow, { top: insets.top + spacing.md }]}>
        <RoundControl
          icon="close"
          label="Close camera"
          onPress={() => router.back()}
        />
        <RoundControl
          icon={flash === 'on' ? 'flash' : 'flash-off'}
          label={flash === 'on' ? 'Flash on' : 'Flash off'}
          onPress={() => setFlash((f) => (f === 'on' ? 'off' : 'on'))}
        />
      </View>

      <View style={[styles.shutterRow, { bottom: insets.bottom + spacing['3xl'] }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Take photo"
          onPress={capture}
          style={({ pressed }) => [styles.shutter, pressed && styles.shutterPressed]}
        >
          {busy ? <ActivityIndicator color={colors.ink} /> : null}
        </Pressable>
      </View>
    </View>
  );
}

/** Dark translucent disc — the only treatment that holds over a live preview. */
function RoundControl({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.control, pressed && styles.controlPressed]}
    >
      <Ionicons name={icon} size={24} color={colors.inkInverse} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.mediaBackdrop,
  },
  topRow: {
    position: 'absolute',
    left: screenPadding,
    right: screenPadding,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  control: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlPressed: {
    opacity: 0.7,
  },
  shutterRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  shutter: {
    width: 78,
    height: 78,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 4,
    borderColor: colors.onMediaBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.9,
  },
  gate: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: screenPadding,
  },
  blurb: {
    marginTop: spacing.sm,
  },
  gateAction: {
    marginTop: spacing['3xl'],
  },
  gateCancel: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
});
