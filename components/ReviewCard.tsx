import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fonts, spacing } from '@/constants/theme';
import { Card } from './Card';
import { Text } from './Text';

export interface Review {
  id: string;
  title: string;
  handle: string;
  body: string;
  stars?: number;
}

export interface ReviewCardProps {
  review: Review;
  style?: StyleProp<ViewStyle>;
}

/** Title, star row with handle, then muted body copy. */
export function ReviewCard({ review, style }: ReviewCardProps) {
  const stars = review.stars ?? 5;

  return (
    <Card style={style}>
      <Text variant="cardTitle" style={styles.title}>
        {review.title}
      </Text>

      <View style={styles.meta}>
        <View style={styles.stars}>
          {Array.from({ length: stars }).map((_, i) => (
            <Ionicons key={i} name="star" size={14} color={colors.ink} />
          ))}
        </View>
        <Text variant="bodyBold" color={colors.inkMuted}>
          {' · '}
          {review.handle}
        </Text>
      </View>

      <Text variant="body" color={colors.inkMuted} style={styles.body}>
        {review.body}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  // The heavy cut, a step past the card-title default: the title and the name
  // are what carry a review, and the body under them is deliberately quiet.
  title: {
    fontFamily: fonts.bodyBold,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  body: {
    marginTop: spacing.md,
  },
});

export default ReviewCard;
