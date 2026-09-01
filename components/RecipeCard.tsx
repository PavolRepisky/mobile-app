import { Image } from 'expo-image';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, shadows, spacing } from '@/constants/theme';
import type { Recipe } from '@/data/recipes';
import { Pill } from './Pill';
import { Text } from './Text';

export interface RecipeCardProps {
  recipe: Recipe;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Masonry tile: image with the prep-time pill tucked into its bottom-left,
 * and the dish name in lowercase underneath.
 */
export function RecipeCard({ recipe, onPress, style }: RecipeCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={recipe.name}
      onPress={onPress}
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed, style]}
    >
      {/* The tile clips its photo, so on iOS it cannot cast as well — the
          shadow lives on this host instead. */}
      <View
        style={[
          styles.tile,
          { aspectRatio: recipe.tall ? 0.72 : 0.92 },
        ]}
      >
        <View style={styles.image}>
          <Image
            source={recipe.image}
            contentFit="cover"
            transition={200}
            style={StyleSheet.absoluteFill}
          />
          <Pill
            label={`${recipe.minutes} min`}
            tone="glass"
            size="sm"
            style={styles.timePill}
          />
        </View>
      </View>

      <Text variant="button" style={styles.name}>
        {recipe.name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.xl,
  },
  tile: {
    width: '100%',
    borderRadius: radii.lg,
    backgroundColor: colors.divider,
    ...shadows.soft,
  },
  image: {
    flex: 1,
    justifyContent: 'flex-end',
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  timePill: {
    margin: spacing.md,
  },
  name: {
    marginTop: spacing.sm,
    color: colors.ink,
  },
  pressed: {
    opacity: 0.9,
  },
});

export default RecipeCard;
