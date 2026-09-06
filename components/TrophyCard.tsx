import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { Challenge } from '@/data/challenges';
import type { Trophy } from '@/data/trophies';
import { colors, spacing } from '@/constants/theme';
import { shortDate } from '@/lib/format';
import { DateRange } from './DateRange';
import { Headline } from './Headline';

export interface TrophyCardProps {
  trophy: Trophy;
  challenge: Challenge;
  width: number;
  style?: StyleProp<ViewStyle>;
}

/** The medal itself, drawn large enough to carry a page on its own. */
const TROPHY_SIZE = 140;

/**
 * One finished challenge, kept flat on the page: the trophy itself, the
 * challenge it was won for, and the dates it ran. No card, no photos — a
 * keepsake this plain reads as something earned rather than something
 * decorated.
 */
export function TrophyCard({ trophy, challenge, width, style }: TrophyCardProps) {
  return (
    <View style={[styles.root, { width }, style]}>
      <Ionicons name="trophy" size={TROPHY_SIZE} color={colors.gold} />

      <Headline size="headline" style={styles.name}>
        {challenge.name}
      </Headline>

      <DateRange
        from={shortDate(new Date(trophy.startDate))}
        to={shortDate(new Date(trophy.finishDate))}
        variant="bodyBold"
        color={colors.inkMuted}
        style={styles.dates}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    marginTop: spacing['2xl'],
  },
  dates: {
    marginTop: spacing.sm,
  },
});

export default TrophyCard;
