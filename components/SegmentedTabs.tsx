import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, fonts, radii, shadows, spacing } from '@/constants/theme';
import { Text } from './Text';

/** The pill switch's measurements, taken off the profile's Grid / Month
 * switch on the design canvas: a short control that sits beside a section
 * heading, not a full-height tab bar. Grown a step past the canvas so the
 * labels set in body type rather than micro: at 13pt "Grid" and "Month"
 * read as a footnote beside the Days heading. */
const PILL_HEIGHT = 36;
const PILL_INSET = 3;
const PILL_ICON = 17;

export interface SegmentOption<T extends string = string> {
  key: T;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export interface SegmentedTabsProps<T extends string = string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (key: T) => void;
  /** A row too long for the screen scrolls sideways; two-up tabs do not. */
  scrollable?: boolean;
  /** `justify` spreads the row across its container on even gaps. */
  align?: 'center' | 'left' | 'justify';
  size?: 'md' | 'lg';
  /**
   * Squeezes a large row a step further. The Saved sheet runs the same five
   * category labels behind a bookmark chip, and that sixth element does not
   * fit a 390pt row at the standard size.
   */
  dense?: boolean;
  /**
   * `underline` is the app's default tab cut. `pill` is the iOS segmented
   * control: both options share a sunken grey track and the selected one
   * rides a white chip inside it — a compact switch for a view toggle beside
   * a heading, like the profile's Grid / Month.
   */
  variant?: 'underline' | 'pill';
  style?: StyleProp<ViewStyle>;
}

/**
 * Underlined text tabs. Used several different ways in the reference — Most
 * Popular/Custom, Friends/Members, Sticker/Post-it — so it takes an icon slot
 * and a scrollable mode.
 */
export function SegmentedTabs<T extends string = string>({
  options,
  value,
  onChange,
  scrollable,
  align = 'center',
  size = 'md',
  dense,
  variant = 'underline',
  style,
}: SegmentedTabsProps<T>) {
  const large = size === 'lg';
  const pill = variant === 'pill';
  const items = options.map((option) => {
    const active = option.key === value;
    return (
      <Pressable
        key={option.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        onPress={() => onChange(option.key)}
        style={[styles.item, pill && styles.pillItem, pill && active && styles.pillActive]}
      >
        <View style={styles.itemRow}>
          {option.icon ? (
            <Ionicons
              name={option.icon}
              size={pill ? PILL_ICON : large && !dense ? 19 : 17}
              color={active ? colors.ink : pill ? colors.inkFaded : colors.inkGhost}
              style={[styles.icon, (dense || pill) && styles.denseIcon]}
            />
          ) : null}
          <Text
            variant={pill ? 'bodyBold' : large ? 'sectionTitle' : 'cardTitle'}
            color={active ? colors.ink : pill ? colors.inkFaded : colors.inkGhost}
            style={
              pill
                ? undefined
                : large
                  ? [styles.lgLabel, dense && styles.denseLabel]
                  : styles.mdLabel
            }
          >
            {option.label}
          </Text>
        </View>
        {pill ? null : (
          <View style={[styles.underline, active && styles.underlineActive]} />
        )}
      </Pressable>
    );
  });

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={style}
        contentContainerStyle={[styles.scrollRow, dense && styles.denseRow]}
      >
        {items}
      </ScrollView>
    );
  }

  // The track ignores `align`: its two halves split it evenly, which is what
  // makes the chip slide between two fixed stops rather than resize with the
  // labels.
  if (pill) {
    return <View style={[styles.row, styles.pillTrack, style]}>{items}</View>;
  }

  return (
    <View
      style={[styles.row, styles[align], style]}
    >
      {items}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  scrollRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingRight: spacing.md,
  },
  denseRow: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  /**
   * Nudged down from the section-title size so a five-up row still fits one
   * 390pt screen, as it does in the reference.
   */
  lgLabel: {
    fontSize: 19,
    lineHeight: 25,
  },
  denseLabel: {
    fontSize: 17,
    lineHeight: 23,
  },
  /** The two-up rows set a step heavier than the card-title cut they scale from. */
  mdLabel: {
    fontFamily: fonts.bodyBold,
  },
  center: {
    justifyContent: 'center',
    gap: spacing['2xl'],
  },
  left: {
    gap: spacing.xl,
  },
  /** No gap of its own: the leftover width *is* the spacing. */
  justify: {
    justifyContent: 'space-between',
  },
  item: {
    alignItems: 'center',
  },
  pillTrack: {
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.pill,
    padding: PILL_INSET,
  },
  pillItem: {
    flex: 1,
    justifyContent: 'center',
    height: PILL_HEIGHT,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
  },
  // White on the grey track, lifted a touch so it reads as the chip that
  // slides rather than a hole cut in the track.
  pillActive: {
    backgroundColor: colors.surface,
    ...shadows.soft,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 6,
  },
  denseIcon: {
    marginRight: 4,
  },
  underline: {
    height: 2,
    alignSelf: 'stretch',
    marginTop: 6,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  underlineActive: {
    backgroundColor: colors.ink,
  },
});

export default SegmentedTabs;
