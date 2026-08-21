import { ScrollView, StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/theme';
import { PhotoSlot } from './PhotoSlot';
import { Text } from './Text';

export interface WallSectionProps {
  title: string;
  /** Stable seed base; when `items` is empty the section shows an add tile. */
  seed: string;
  /** Number of filled tiles. Zero renders just the empty add slot. */
  count?: number;
  onAdd?: () => void;
}

/**
 * One collection on the profile wall — a heading over a horizontal row of
 * tiles, ending in an empty "+" slot.
 */
export function WallSection({ title, seed, count = 0, onAdd }: WallSectionProps) {
  return (
    <View style={styles.section}>
      <Text variant="sectionTitle" style={styles.title}>
        {title}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {Array.from({ length: count }).map((_, i) => (
          <PhotoSlot
            key={i}
            seed={`${seed}-${i}`}
            width={124}
            height={172}
            shadow={false}
          />
        ))}

        <PhotoSlot
          seed={null}
          width={124}
          height={172}
          emptyIcon="add"
          shadow={false}
          onPress={onAdd}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing['4xl'],
  },
  title: {
    marginBottom: spacing.lg,
  },
  row: {
    gap: spacing.md,
    paddingRight: spacing.xl,
  },
});

export default WallSection;
