import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/constants/theme';

export interface TickProgressBarProps {
  /** Current day, 1-indexed. */
  day: number;
  totalDays: number;
  /** Ticks drawn. The reference shows ~19 across the width, not one per day. */
  count?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * The row of short vertical strokes under the day ring on the To-do home.
 * Completed ticks are solid; the remainder fades toward the right edge rather
 * than stopping hard, which is what gives the bar its hand-drawn feel.
 */
export function TickProgressBar({
  day,
  totalDays,
  count = 19,
  height = 34,
  style,
}: TickProgressBarProps) {
  const ratio = totalDays > 0 ? Math.min(day / totalDays, 1) : 0;
  const filled = Math.round(ratio * count);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`Day ${day} of ${totalDays}`}
      style={[styles.row, { height }, style]}
    >
      {Array.from({ length: count }).map((_, i) => {
        // Everything up to `filled` is solid; past that the ramp trails off.
        const decay = Math.max(0.06, 1 - (i / count) * 1.25);
        const opacity = i < filled ? 1 : decay;
        return (
          <View
            key={i}
            style={[styles.tick, { height, opacity }]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
  },
  tick: {
    width: 3.5,
    borderRadius: 2,
    backgroundColor: colors.ink,
  },
});

export default TickProgressBar;
