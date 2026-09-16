import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { absoluteFill, colors, glass, radii, spacing } from '@/constants/theme';
import { CAN_BLUR } from './GlassSurface';
import { Text } from './Text';

export interface LockedOverlayProps {
  /** `false` renders `children` plain — the gate this wraps hasn't shut. */
  locked: boolean;
  title: string;
  hint?: string;
  /** Tapping the lock's own message, not the blurred content under it. */
  onPress?: () => void;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * Blurs out whatever it wraps and reads a lock's message over it instead —
 * the Community feed before a single task has been proven with a photo, so
 * far. The content stays mounted underneath, unblurred state intact for the
 * moment it unlocks, but `pointerEvents="none"` while locked: none of its
 * own taps — a like, a profile, the carousel — should fire through the glass.
 */
export function LockedOverlay({
  locked,
  title,
  hint,
  onPress,
  radius = radii.lg,
  style,
  children,
}: LockedOverlayProps) {
  if (!locked) return <>{children}</>;

  return (
    <View style={[styles.root, { borderRadius: radius }, style]}>
      <View pointerEvents="none">{children}</View>

      {/* A near-opaque dark wash first, always drawn — `BlurView` has no
          real backdrop blur on web and on Android short of the experimental
          method, and a lock the photo still shows plainly through is no
          lock at all. The `BlurView` on top adds real blur texture where
          the platform actually supports it; the wash alone is what actually
          hides the shot everywhere else. */}
      <View style={[absoluteFill, styles.wash]} />

      {CAN_BLUR ? (
        <BlurView
          intensity={glass.blur}
          tint="dark"
          experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
          style={absoluteFill}
        />
      ) : null}

      <Pressable
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={title}
        onPress={onPress}
        style={[absoluteFill, styles.message]}
      >
        <Ionicons name="lock-closed" size={28} color={colors.inkInverse} />
        <Text variant="cardTitleBold" color={colors.inkInverse} center style={styles.title}>
          {title}
        </Text>
        {hint ? (
          <Text variant="body" color={colors.onMediaSoft} center style={styles.hint}>
            {hint}
          </Text>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
  },
  wash: {
    backgroundColor: colors.scrimLock,
  },
  message: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  title: {
    marginTop: spacing.sm,
  },
  hint: {
    marginTop: spacing.xs,
  },
});

export default LockedOverlay;
