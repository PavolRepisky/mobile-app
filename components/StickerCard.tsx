import { Ionicons } from '@expo/vector-icons';
import {
  StyleSheet,
  Text as RNText,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, fonts, radii, shadows, spacing } from '@/constants/theme';
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
  style,
}: StickerCardProps) {
  return (
    <View style={[styles.card, width ? { width } : null, style]}>
      <RNText style={styles.heading}>
        <RNText style={styles.headingItalic}>day </RNText>
        {numberToWord(day)}
      </RNText>

      <DateRange
        from={from}
        to={to}
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
        <Text variant="micro" color={colors.inkSoft}>
          {challengeName.toUpperCase()}
        </Text>
        <Text variant="micro" color={colors.inkSoft}>
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
    ...shadows.card,
  },
  heading: {
    fontFamily: fonts.displayBlack,
    fontSize: 32,
    lineHeight: 38,
    color: colors.ink,
  },
  headingItalic: {
    fontFamily: fonts.displayBlackItalic,
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
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.dividerStrong,
  },
});

export default StickerCard;
