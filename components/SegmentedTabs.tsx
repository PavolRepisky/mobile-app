import NativeSegmentedControl, {
  type SegmentedControlProps,
} from '@react-native-segmented-control/segmented-control';
import { Pressable, StyleSheet, useColorScheme, type StyleProp, type ViewStyle, View } from 'react-native';

import { colors, colorsFor, radii, shadows, spacing } from '@/constants/theme';
import { NATIVE_HEADER } from './Screen';
import { Text } from './Text';

/** The switch's measurements, taken off the profile's Grid / Month switch on
 * the design canvas: a short control that sits beside a section heading, not
 * a full-height tab bar. */
const PILL_HEIGHT = 36;
/** The small chip: a view switch tucked beside a heading, sized to the
 * heading's own line rather than to a full-width row. */
const PILL_HEIGHT_SM = 30;
const PILL_INSET = 3;

/**
 * The system control, retyped as a plain component: its class is declared
 * against the mixin React Native's old types had, which RN 0.88's function
 * components no longer satisfy as a JSX element. It renders the same.
 */
const SegmentedControl = NativeSegmentedControl as unknown as React.ComponentType<SegmentedControlProps>;

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
  // On the iPhone it is the system's own control — its track, its sliding
  // chip, its spring and its type.
  // The native control takes plain colours, so it picks its pair for the
  // phone's appearance.
  const scheme = colorsFor(useColorScheme());
  if (NATIVE_HEADER) {
    return (
      <SegmentedControl
        values={options.map((option) => option.label)}
        selectedIndex={Math.max(
          options.findIndex((option) => option.key === value),
          0,
        )}
        onChange={(e) => {
          const picked = options[e.nativeEvent.selectedSegmentIndex];
          if (picked) onChange(picked.key);
        }}
        fontStyle={{ color: scheme.inkMuted }}
        activeFontStyle={{ color: scheme.ink }}
        style={[size === 'sm' ? styles.nativeSm : styles.native, style]}
      />
    );
  }

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
  native: {
    height: PILL_HEIGHT,
  },
  nativeSm: {
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
