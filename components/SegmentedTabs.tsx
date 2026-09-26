import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, fonts, spacing } from '@/constants/theme';
import { Text } from './Text';

/** The icon row's measurements, taken off Instagram's own profile tabs: a
 * glyph big enough to carry the tab without a word under it, on a row tall
 * enough to be an easy thumb target across the whole width. */
const ICON_TAB_GLYPH = 23;
const ICON_TAB_HEIGHT = 44;
/** Half the gap between neighbouring underlines, on each side of every tab
 * — the same half-gap a profile grid tile keeps (`spacing.xs / 2`), so a
 * three-up row's underlines sit exactly over the three photo columns below,
 * edge for edge and gap for gap. */
const ICON_TAB_INSET = spacing.xs / 2;

export interface SegmentOption<T extends string = string> {
  key: T;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Worn while the tab is selected — the filled cut of `icon`, the way
   * Instagram fills in the tab you're on. Falls back to `icon`. */
  activeIcon?: keyof typeof Ionicons.glyphMap;
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
   * `underline` is the app's default tab cut. `icons` is Instagram's profile
   * tab row: glyphs only, each tab an even share of the width, the selected
   * one filled in and underlined — a view switch that needs no heading of its
   * own, like the profile's Grid / Month. `label` still names each tab to a
   * screen reader.
   */
  variant?: 'underline' | 'icons';
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

  if (variant === 'icons') {
    return (
      <View style={[styles.row, style]}>
        {options.map((option) => {
          const active = option.key === value;
          const glyph = active ? (option.activeIcon ?? option.icon) : option.icon;
          return (
            <Pressable
              key={option.key}
              accessibilityRole="tab"
              accessibilityLabel={option.label}
              accessibilityState={{ selected: active }}
              onPress={() => onChange(option.key)}
              style={styles.iconItem}
            >
              <View style={styles.iconGlyph}>
                {glyph ? (
                  <Ionicons
                    name={glyph}
                    size={ICON_TAB_GLYPH}
                    color={active ? colors.ink : colors.inkFaded}
                  />
                ) : null}
              </View>
              <View style={[styles.iconUnderline, active && styles.underlineActive]} />
            </Pressable>
          );
        })}
      </View>
    );
  }

  const items = options.map((option) => {
    const active = option.key === value;
    return (
      <Pressable
        key={option.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        onPress={() => onChange(option.key)}
        style={styles.item}
      >
        <View style={styles.itemRow}>
          {option.icon ? (
            <Ionicons
              name={option.icon}
              size={large && !dense ? 19 : 17}
              color={active ? colors.ink : colors.inkGhost}
              style={[styles.icon, dense && styles.denseIcon]}
            />
          ) : null}
          <Text
            variant={large ? 'sectionTitle' : 'cardTitle'}
            color={active ? colors.ink : colors.inkGhost}
            style={large ? [styles.lgLabel, dense && styles.denseLabel] : styles.mdLabel}
          >
            {option.label}
          </Text>
        </View>
        <View style={[styles.underline, active && styles.underlineActive]} />
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
  iconItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: ICON_TAB_INSET,
  },
  iconGlyph: {
    height: ICON_TAB_HEIGHT,
    justifyContent: 'center',
  },
  iconUnderline: {
    alignSelf: 'stretch',
    height: 2,
    borderRadius: 2,
    backgroundColor: 'transparent',
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
