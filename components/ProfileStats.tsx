import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, spacing } from '@/constants/theme';
import { AlertDialog } from './AlertDialog';
import { Text } from './Text';

export interface ProfileStat {
  /** Distinguishes the columns; also what a tap handler is keyed on. */
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Defaults to `ink` — the same weight as the numeral it sits over, so the
   * glyph reads as part of one solid stat rather than a greyed-out, disabled
   * decoration next to it. Set for a stat whose glyph already carries a
   * colour elsewhere in the app (the gold trophy, the red heart). */
  iconColor?: string;
  value: number | string;
  label: string;
  onPress?: () => void;
  /**
   * Renders a small (i) after the label; tapping it explains the stat in a
   * dialog rather than crowding the caption itself with a footnote. For a
   * number whose meaning isn't self-evident from the label alone — misses
   * left, say.
   */
  info?: string;
}

export interface ProfileStatsProps {
  stats: readonly ProfileStat[];
  /** Off for the app's own profile, which reads as a plain tally with no
   * glyph over each numeral. Defaults on — a friend's profile keeps the icon
   * lending each column its own identity. */
  showIcons?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** The glyph over each numeral — a shade under it, not competing with it. */
const iconSize = 15;

/** The info glyph after a label — outline icons this small read as too thin
 * on their own, so a second copy a hair off the first thickens the stroke
 * the same way the header's settings glyph does. */
const infoIconSize = 13;
const infoIconBoldOffset = 0.6;

/**
 * The three-up tally under the bio — friends, trophies, lives.
 *
 * Set as plain numerals on the page rather than as chips: nothing else on
 * this screen sits in a grey box, and a stat is a reading off the account,
 * not a widget. A hairline between columns is enough to divide them. The two
 * that lead somewhere carry a chevron so the tap doesn't come as a surprise.
 *
 * Numerals here are functional rather than editorial, so they stay at
 * section-title size rather than headline size: a stat is a reading off the
 * account, not something the page says.
 */
export function ProfileStats({ stats, showIcons = true, style }: ProfileStatsProps) {
  const [infoStat, setInfoStat] = useState<ProfileStat | null>(null);

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
          {showIcons ? (
            <Ionicons
              name={stat.icon}
              size={iconSize}
              color={stat.iconColor ?? colors.ink}
            />
          ) : null}
          <Text
            variant="sectionTitle"
            style={showIcons ? styles.value : undefined}
          >
            {stat.value}
          </Text>
          <View style={styles.labelRow}>
            <Text
              variant="caption"
              color={colors.inkMuted}
              center
              style={styles.label}
            >
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
            {stat.info ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`About ${stat.label}`}
                onPress={() => setInfoStat(stat)}
                hitSlop={spacing.sm}
                style={styles.infoTap}
              >
                <View style={styles.infoIconStack}>
                  <Ionicons
                    name="information-circle-outline"
                    size={infoIconSize}
                    color={colors.inkMuted}
                  />
                  <Ionicons
                    name="information-circle-outline"
                    size={infoIconSize}
                    color={colors.inkMuted}
                    style={styles.infoIconOverlay}
                  />
                </View>
              </Pressable>
            ) : null}
          </View>
        </Pressable>
      ))}

      <AlertDialog
        visible={infoStat !== null}
        title={infoStat?.label ?? ''}
        message={infoStat?.info}
        onDismiss={() => setInfoStat(null)}
        actions={[{ label: 'Got it', onPress: () => setInfoStat(null) }]}
      />
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
    // Stretched rather than left to hug its content: a two-word label like
    // "Completed Challenges" needs the column's full width to wrap onto a
    // second line instead of running past the divider.
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  label: {
    flexShrink: 1,
  },
  chevron: {
    marginLeft: 1,
    // Ionicons' chevron-forward glyph sits high in its own box — a couple of
    // px of top margin is what actually lines it up with the label text.
    marginTop: 2,
  },
  infoTap: {
    marginLeft: 3,
  },
  infoIconStack: {
    width: infoIconSize + infoIconBoldOffset,
    height: infoIconSize + infoIconBoldOffset,
  },
  infoIconOverlay: {
    position: 'absolute',
    left: infoIconBoldOffset,
    top: infoIconBoldOffset,
  },
});

export default ProfileStats;
