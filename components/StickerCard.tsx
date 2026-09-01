import { Ionicons } from '@expo/vector-icons';
import {
  StyleSheet,
  Text as RNText,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import {
  colors,
  displayTracking,
  fonts,
  radii,
  shadows,
  spacing,
} from '@/constants/theme';
import { numberToWord } from '@/lib/format';
import { DateRange } from './DateRange';
import { Text } from './Text';

export interface StickerCardProps {
  day: number;
  /** Start and end of the challenge, e.g. "aug 18" and "oct 31". */
  from: string;
  to: string;
  tasks: readonly string[];
  /** Numbered for the pre-start sticker; ticked for a completed day. */
  mode?: 'numbered' | 'checked';
  /** Bottom-left label, e.g. "75 HARD" or "HER 75 CHALLENGE". */
  challengeName: string;
  width?: number;
  /** Small seeded rotation, so a column of cards reads as a stack of prints. */
  tilt?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * The shareable "day one" card. The heading pairs a Playfair italic "day" with
 * an upright black numeral word, and the footer carries the challenge name and
 * the BY HER 75 attribution.
 */
export function StickerCard({
  day,
  from,
  to,
  tasks,
  mode = 'numbered',
  challengeName,
  width,
  tilt = 0,
  style,
}: StickerCardProps) {
  return (
    <View
      style={[
        styles.card,
        width ? { width } : null,
        tilt ? { transform: [{ rotate: `${tilt}deg` }] } : null,
        style,
      ]}
    >
      <RNText style={styles.heading}>
        <RNText style={styles.headingItalic}>day </RNText>
        {numberToWord(day)}
      </RNText>

      <DateRange
        from={from}
        to={to}
        variant="caption"
        color={colors.inkSoft}
        style={styles.range}
      />

      <View style={styles.list}>
        {tasks.map((task, i) => (
          <View key={i} style={styles.item}>
            <View style={styles.marker}>
              {mode === 'numbered' ? (
                <RNText style={styles.numeral}>{i + 1}</RNText>
              ) : (
                <Ionicons name="checkmark" size={20} color={colors.ink} />
              )}
            </View>
            <Text variant="body" style={styles.itemText}>
              {task}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Text variant="micro" color={colors.inkSoft} style={styles.footerText}>
          {challengeName.toUpperCase()}
        </Text>
        <Text variant="micro" color={colors.inkSoft} style={styles.footerText}>
          BY HER 75
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing['2xl'],
    // Without this the card shrinks to fit its own text inside a centring
    // parent, which leaves the `flex: 1` task labels unbounded — they run
    // straight over the right edge instead of wrapping. Stretching it also
    // buys the widest line the page allows.
    alignSelf: 'stretch',
    ...shadows.card,
  },
  heading: {
    // Bold rather than black: at 32px the heavy cut reads as a shout next to
    // the light date line under it.
    fontFamily: fonts.displayBold,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: displayTracking,
    color: colors.ink,
  },
  headingItalic: {
    fontFamily: fonts.displayBoldItalic,
  },
  range: {
    marginTop: spacing.sm,
  },
  list: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  marker: {
    width: 30,
    alignItems: 'center',
  },
  numeral: {
    fontFamily: fonts.displayMedium,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: displayTracking,
    color: colors.ink,
  },
  itemText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    paddingTop: spacing.md,
    // A drawn rule, not a hairline: it closes the card off the way the
    // reference does.
    borderTopWidth: 2,
    borderTopColor: colors.dividerStrong,
  },
  footerText: {
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.3,
  },
});

export default StickerCard;
