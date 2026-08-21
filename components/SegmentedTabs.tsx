import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, spacing } from '@/constants/theme';
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
  align?: 'center' | 'left';
  size?: 'md' | 'lg';
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
  style,
}: SegmentedTabsProps<T>) {
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
              size={size === 'lg' ? 19 : 17}
              color={active ? colors.ink : colors.inkMuted}
              style={styles.icon}
            />
          ) : null}
          <Text
            variant={size === 'lg' ? 'sectionTitle' : 'cardTitle'}
            color={active ? colors.ink : colors.inkMuted}
            style={size === 'lg' ? styles.lgLabel : undefined}
          >
            {option.label}
          </Text>
        </View>
        <View
          style={[styles.underline, active && styles.underlineActive]}
        />
      </Pressable>
    );
  });

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={style}
        contentContainerStyle={styles.scrollRow}
      >
        {items}
      </ScrollView>
    );
  }

  return (
    <View
      style={[
        styles.row,
        align === 'center' ? styles.center : styles.left,
        style,
      ]}
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
  /**
   * Nudged down from the section-title size so all five recipe categories fit
   * one 390pt row, as they do in the reference.
   */
  lgLabel: {
    fontSize: 19,
    lineHeight: 25,
    letterSpacing: -1,
  },
  center: {
    justifyContent: 'center',
    gap: spacing['2xl'],
  },
  left: {
    gap: spacing.xl,
  },
  item: {
    alignItems: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 6,
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
