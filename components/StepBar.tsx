import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, layout, radii } from '@/constants/theme';
import { accentAt } from './TaskRing';

/** The segments: thin enough to read as a track, not a button. */
const STEP_BAR = 6;

export interface StepBarProps {
  /** 1-indexed: how many segments are filled. */
  step: number;
  total: number;
  /**
   * Fills in the accent rather than ink — for progress, not a flow's steps:
   * each segment takes the colour of where it sits along the gradient, the
   * way the run card's day squares do, peach first and lavender last.
   */
  accent?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** How far along a multi-step flow you are: one segment per step, filled in
 * ink as you reach it, the rest in the not-yet grey. Sits in a
 * `ScreenHeader`'s `middle`, where the title would go. */
export function StepBar({ step, total, accent, style }: StepBarProps) {
  return (
    <View style={[styles.bar, style]}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.segment,
            i < step && (accent ? { backgroundColor: accentAt((i + 0.5) / total) } : styles.segmentOn),
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    gap: layout.grid,
  },
  segment: {
    flex: 1,
    height: STEP_BAR,
    borderRadius: radii.pill,
    backgroundColor: colors.inkGhost,
  },
  segmentOn: {
    backgroundColor: colors.ink,
  },
});

export default StepBar;
