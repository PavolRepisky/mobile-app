import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AvatarPlaceholder, Placeholder } from '@/components/Placeholder';
import { Text } from '@/components/Text';
import { absoluteFill, colors, radii, spacing } from '@/constants/theme';
import { useApp } from '@/hooks/useAppState';

/**
 * Full-bleed story viewer over today's proof photos. Tapping the right half
 * advances, the left half goes back, and running past the end closes.
 */
export default function StoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, currentDay, progress } = useApp();
  const [index, setIndex] = useState(0);

  const photos = useMemo(() => {
    const dayMap = progress[currentDay] ?? {};
    const seeds = Object.values(dayMap)
      .map((p) => p.photoSeed)
      .filter((s): s is string => !!s);
    return seeds.length ? seeds : ['story-empty'];
  }, [progress, currentDay]);

  const advance = (delta: number) => {
    const next = index + delta;
    if (next < 0) return;
    if (next >= photos.length) {
      router.back();
      return;
    }
    setIndex(next);
  };

  return (
    <View style={styles.root}>
      <Placeholder
        seed={photos[index]}
        radius={0}
        style={absoluteFill}
      />

      <View style={[styles.chrome, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.bars}>
          {photos.map((seed, i) => (
            <View
              key={seed}
              style={[styles.bar, i <= index && styles.barFilled]}
            />
          ))}
        </View>

        <View style={styles.head}>
          <AvatarPlaceholder seed={profile.avatarSeed} size={34} />
          <Text variant="bodyStrong" color={colors.inkInverse} style={styles.name}>
            {profile.name}
          </Text>
          <Text variant="body" color="rgba(255,255,255,0.8)">
            {'  ·  '}4m ago
          </Text>

          <View style={styles.spacer} />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => router.back()}
            hitSlop={12}
          >
            <Ionicons name="close" size={26} color={colors.inkInverse} />
          </Pressable>
        </View>
      </View>

      {/* Tap zones sit under the chrome so the close button still wins. */}
      <View style={styles.zones} pointerEvents="box-none">
        <Pressable
          accessibilityLabel="Previous"
          style={styles.zone}
          onPress={() => advance(-1)}
        />
        <Pressable
          accessibilityLabel="Next"
          style={styles.zone}
          onPress={() => advance(1)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  chrome: {
    paddingHorizontal: spacing.lg,
    zIndex: 2,
  },
  bars: {
    flexDirection: 'row',
    gap: 4,
  },
  bar: {
    flex: 1,
    height: 3,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  barFilled: {
    backgroundColor: colors.inkInverse,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  name: {
    marginLeft: spacing.md,
  },
  spacer: {
    flex: 1,
  },
  zones: {
    ...absoluteFill,
    flexDirection: 'row',
    zIndex: 1,
  },
  zone: {
    flex: 1,
  },
});
