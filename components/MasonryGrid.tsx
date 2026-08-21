import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { spacing } from '@/constants/theme';

export interface MasonryGridProps<T> {
  items: readonly T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string;
  /** Relative height of each item, used to balance the columns. */
  weight?: (item: T) => number;
  columns?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Two-column staggered grid. Items are dealt into whichever column is
 * currently shortest, which is what gives the recipe list its offset rhythm
 * instead of a rigid pair-by-pair layout.
 */
export function MasonryGrid<T>({
  items,
  renderItem,
  keyExtractor,
  weight = () => 1,
  columns = 2,
  style,
}: MasonryGridProps<T>) {
  const buckets: { item: T; index: number }[][] = Array.from(
    { length: columns },
    () => [],
  );
  const heights = new Array(columns).fill(0);

  items.forEach((item, index) => {
    let shortest = 0;
    for (let c = 1; c < columns; c += 1) {
      if (heights[c] < heights[shortest]) shortest = c;
    }
    buckets[shortest].push({ item, index });
    heights[shortest] += weight(item);
  });

  return (
    <View style={[styles.row, style]}>
      {buckets.map((bucket, c) => (
        <View key={c} style={styles.column}>
          {bucket.map(({ item, index }) => (
            <View key={keyExtractor(item, index)}>{renderItem(item, index)}</View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  column: {
    flex: 1,
  },
});

export default MasonryGrid;
