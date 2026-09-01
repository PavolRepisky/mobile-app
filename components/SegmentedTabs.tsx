import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, fonts, radii, spacing } from '@/constants/theme';
import { Text } from './Text';

export interface SegmentOption<T extends string = string> {
  key: T;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export interface SegmentedTabsProps<T extends string = string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (key: T) => void;
  /** Recipe categories scroll horizontally; the two-up tabs do not. */
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
   * control: both options share a sunken track and the selected one rides a
   * lighter chip inside it — for tabs that sit on a control bar rather than
   * over the page, like the photo picker's Photos / Collections switch.
   */
  variant?: 'underline' | 'pill';
  style?: StyleProp<ViewStyle>;
}

/**
 * Underlined text tabs. Used five different ways in the reference — Most
 * Popular/Custom, Profile/My Wall, Sticker/Post-it, the recipe categories, and
 * the Saved sheet — so it takes an icon slot and a scrollable mode.
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
              size={large && !dense ? 19 : 17}
              color={active ? colors.ink : pill ? colors.inkSoft : colors.inkGhost}
              style={[styles.icon, dense && styles.denseIcon]}
            />
          ) : null}
          <Text
            variant={large ? 'sectionTitle' : 'cardTitle'}
            color={active ? colors.ink : pill ? colors.inkSoft : colors.inkGhost}
            style={
              large ? [styles.lgLabel, dense && styles.denseLabel] : styles.mdLabel
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
   * Nudged down from the section-title size so all five recipe categories fit
   * one 390pt row, as they do in the reference.
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
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    padding: 4,
  },
  pillItem: {
    flex: 1,
    justifyContent: 'center',
    height: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
  },
  pillActive: {
    backgroundColor: colors.divider,
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
