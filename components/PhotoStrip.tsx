import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radii, shadows, spacing } from '@/constants/theme';
import { Pill } from './Pill';
import { Placeholder } from './Placeholder';
import { Text } from './Text';

export interface PhotoStripProps {
  /** Seeds for the tiles — four across in the reference. */
  seeds: readonly string[];
  height?: number;
  /** White pill overlapping the top edge, e.g. "+10,000 joined". */
  badge?: string;
  radius?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * The flush four-up photo row that represents a challenge everywhere it
 * appears. The joined-count badge floats over the top edge, centred.
 */
export function PhotoStrip({
  seeds,
  height = 160,
  badge,
  radius = radii.lg,
  onPress,
  style,
}: PhotoStripProps) {
  const body = (
    <View style={[styles.wrap, style]}>
      <View style={[styles.strip, { height, borderRadius: radius }]}>
        {seeds.map((seed, i) => (
          <Placeholder key={`${seed}-${i}`} seed={seed} radius={0} style={styles.cell} />
        ))}
      </View>

      {badge ? (
        <View pointerEvents="none" style={styles.badge}>
          {/* Pill defaults to flex-start, which would beat the wrapper's centring. */}
          <Pill label={badge} style={styles.badgePill} />
        </View>
      ) : null}
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}
    >
      {body}
    </Pressable>
  );
}

/** Photo strip plus its title — one row of the "Select your challenge" list. */
export function ChallengeRow({
  title,
  seeds,
  joined,
  onPress,
  style,
}: {
  title: string;
  seeds: readonly string[];
  joined?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [style, pressed && styles.pressed]}
    >
      <PhotoStrip seeds={seeds} badge={joined} />
      <Text variant="sectionTitle" style={styles.rowTitle}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    // Room for the badge to sit proud of the strip.
    paddingTop: spacing.md,
  },
  strip: {
    flexDirection: 'row',
    overflow: 'hidden',
    ...shadows.soft,
  },
  cell: {
    flex: 1,
  },
  badge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  badgePill: {
    alignSelf: 'center',
  },
  rowTitle: {
    marginTop: spacing.md,
  },
  pressed: {
    opacity: 0.9,
  },
});

export default PhotoStrip;
