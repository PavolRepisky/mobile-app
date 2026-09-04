import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, spacing } from '@/constants/theme';
import { Text } from './Text';

export interface ProfileStat {
  /** Distinguishes the columns; also what a tap handler is keyed on. */
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: number | string;
  label: string;
  onPress?: () => void;
}

export interface ProfileStatsProps {
  stats: readonly ProfileStat[];
  style?: StyleProp<ViewStyle>;
}

/**
 * Height of the hairline between two columns. Short of the column itself, so
 * the rule reads as a separator between the numbers rather than as a frame
 * drawn around them.
 */
const dividerHeight = 34;

/** The glyph crowning each column, a shade under the numeral it sits over. */
const iconSize = 19;

/**
 * The three-up tally under the bio — friends, trophies, lives.
 *
 * Numerals here are functional rather than editorial, so they stay in
 * Quicksand: Playfair is the app's voice for a headline, and a stat is a
 * reading off the account, not something the page says.
 */
export function ProfileStats({ stats, style }: ProfileStatsProps) {
  return (
    <View style={[styles.row, style]}>
      {stats.map((stat, i) => (
        <View key={stat.key} style={styles.cell}>
          {i > 0 ? <View style={styles.divider} /> : null}
          <Pressable
            accessibilityRole={stat.onPress ? 'button' : undefined}
            accessibilityLabel={`${stat.value} ${stat.label}`}
            disabled={!stat.onPress}
            onPress={stat.onPress}
            style={({ pressed }) => [
              styles.column,
              pressed && stat.onPress ? styles.pressed : null,
            ]}
          >
            <Ionicons name={stat.icon} size={iconSize} color={colors.ink} />
            <Text variant="sectionTitle" style={styles.value}>
              {stat.value}
            </Text>
            <Text variant="caption" color={colors.inkMuted}>
              {stat.label}
            </Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // The divider is absolutely placed inside the cell rather than laid between
  // cells, so all three columns stay exactly the same width whatever their
  // numbers run to.
  cell: {
    flex: 1,
  },
  divider: {
    position: 'absolute',
    left: 0,
    top: '50%',
    marginTop: -dividerHeight / 2,
    width: StyleSheet.hairlineWidth,
    height: dividerHeight,
    backgroundColor: colors.dividerStrong,
  },
  column: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  pressed: {
    opacity: 0.6,
  },
  value: {
    marginTop: spacing.xs,
  },
});

export default ProfileStats;
