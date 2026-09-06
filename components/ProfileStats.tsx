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
  /** Defaults to `inkMuted` — set for a stat whose glyph already carries a
   * colour elsewhere in the app (the gold trophy, the red heart). */
  iconColor?: string;
  value: number | string;
  label: string;
  onPress?: () => void;
}

export interface ProfileStatsProps {
  stats: readonly ProfileStat[];
  style?: StyleProp<ViewStyle>;
}

/** The glyph over each numeral — a shade under it, not competing with it. */
const iconSize = 15;

/**
 * The three-up tally under the bio — friends, trophies, lives.
 *
 * Set as plain numerals on the page rather than as chips: nothing else on
 * this screen sits in a grey box, and a stat is a reading off the account,
 * not a widget. A hairline between columns is enough to divide them. The two
 * that lead somewhere carry a chevron so the tap doesn't come as a surprise.
 *
 * Numerals here are functional rather than editorial, so they stay in
 * Quicksand: Playfair is the app's voice for a headline, and a stat is a
 * reading off the account, not something the page says.
 */
export function ProfileStats({ stats, style }: ProfileStatsProps) {
  return (
    <View style={[styles.row, style]}>
      {stats.map((stat, index) => (
        <Pressable
          key={stat.key}
          accessibilityRole={stat.onPress ? 'button' : undefined}
          accessibilityLabel={`${stat.value} ${stat.label}`}
          disabled={!stat.onPress}
          onPress={stat.onPress}
          style={({ pressed }) => [
            styles.column,
            index > 0 && styles.divider,
            pressed && stat.onPress ? styles.pressed : null,
          ]}
        >
          <Ionicons
            name={stat.icon}
            size={iconSize}
            color={stat.iconColor ?? colors.inkMuted}
          />
          <Text variant="sectionTitle" style={styles.value}>
            {stat.value}
          </Text>
          <View style={styles.labelRow}>
            <Text variant="caption" color={colors.inkMuted}>
              {stat.label}
            </Text>
            {stat.onPress ? (
              <Ionicons
                name="chevron-forward"
                size={11}
                color={colors.inkMuted}
                style={styles.chevron}
              />
            ) : null}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  column: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.divider,
  },
  pressed: {
    opacity: 0.6,
    transform: [{ scale: 0.96 }],
  },
  value: {
    marginTop: spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chevron: {
    marginLeft: 1,
    // Ionicons' chevron-forward glyph sits high in its own box — a couple of
    // px of top margin is what actually lines it up with the label text.
    marginTop: 2,
  },
});

export default ProfileStats;
