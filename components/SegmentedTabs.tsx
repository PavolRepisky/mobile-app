import { Pressable, StyleSheet, type StyleProp, type ViewStyle, View } from 'react-native';

import { colors, radii, shadows, spacing } from '@/constants/theme';
import { Text } from './Text';

/** The switch's measurements, taken off the profile's Grid / Month switch on
 * the design canvas: a short control that sits beside a section heading, not
 * a full-height tab bar. */
const PILL_HEIGHT = 36;
/** The small chip: a view switch tucked beside a heading, sized to the
 * heading's own line rather than to a full-width row. */
const PILL_HEIGHT_SM = 30;
const PILL_INSET = 3;

export interface SegmentOption<T extends string = string> {
  key: T;
  label: string;
}

export interface SegmentedTabsProps<T extends string = string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (key: T) => void;
  /** `sm` is a shorter chip for a switch sitting beside a heading rather than
   * across the page. */
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
}

/**
 * The iOS segmented control: every option shares a sunken grey track and the
 * selected one rides a white chip inside it. The halves split the track
 * evenly, which is what makes the chip slide between fixed stops rather than
 * resize with the labels. Labels are set at `metaBold`, so three halves
 * carrying counts ("Starting soon 2") still fit one row.
 */
export function SegmentedTabs<T extends string = string>({
  options,
  value,
  onChange,
  size = 'md',
  style,
}: SegmentedTabsProps<T>) {
  return (
    <View style={[styles.track, style]}>
      {options.map((option) => {
        const active = option.key === value;
        return (
          <Pressable
            key={option.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.key)}
            style={[styles.item, size === 'sm' && styles.itemSm, active && styles.active]}
          >
            {/* The half not on show is still one tap away and still read, so
                it takes `inkMuted` — `inkGhost` is for what can't be used yet. */}
            <Text
              variant="metaBold"
              numberOfLines={1}
              color={active ? colors.ink : colors.inkMuted}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.pill,
    padding: PILL_INSET,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: PILL_HEIGHT,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
  },
  itemSm: {
    height: PILL_HEIGHT_SM,
  },
  // White on the grey track, lifted a touch so it reads as the chip that
  // slides rather than a hole cut in the track.
  active: {
    backgroundColor: colors.surface,
    ...shadows.soft,
  },
});

export default SegmentedTabs;
