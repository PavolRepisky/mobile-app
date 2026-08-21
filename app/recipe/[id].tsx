import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/IconButton';
import { ScreenScroll } from '@/components/Screen';
import { Text } from '@/components/Text';
import { colors, radii, screenPadding, spacing } from '@/constants/theme';
import { recipeById } from '@/data/recipes';
import { useApp } from '@/hooks/useAppState';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { savedRecipeIds, toggleSavedRecipe } = useApp();

  const recipe = recipeById(String(id));
  const isSaved = recipe ? savedRecipeIds.includes(recipe.id) : false;

  if (!recipe) {
    return (
      <ScreenScroll>
        <Text variant="sectionTitle">Recipe not found</Text>
      </ScreenScroll>
    );
  }

  return (
    // Absolute overlays need a positioned parent, otherwise their offsets
    // resolve against the scroll content instead of the screen.
    <View style={styles.screenRoot}>
      <ScreenScroll padded={false} bottomExtra={spacing['4xl']} tone="onboarding">
        <Image
          source={recipe.image}
          contentFit="cover"
          transition={200}
          style={styles.hero}
        />

        <View style={styles.body}>
          <Text variant="sectionTitle">{recipe.name}</Text>
          <Text variant="body" color={colors.inkMuted} style={styles.subtitle}>
            {recipe.subtitle}
          </Text>

          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text variant="sectionTitle">{recipe.minutes} min</Text>
              <Text variant="label" color={colors.inkMuted} style={styles.statLabel}>
                PREP
              </Text>
            </View>
            <View style={styles.stat}>
              <Text variant="sectionTitle">{recipe.servings}</Text>
              <Text variant="label" color={colors.inkMuted} style={styles.statLabel}>
                {recipe.servings === 1 ? 'SERVING' : 'SERVINGS'}
              </Text>
            </View>
          </View>

          <View style={styles.rule} />

          <Text variant="sectionTitle" style={styles.heading}>
            ingredients
          </Text>
          {recipe.ingredients.map((line) => (
            <View key={line.item} style={styles.ingredient}>
              <Text
                variant="body"
                color={colors.inkMuted}
                style={styles.amount}
              >
                {line.amount}
              </Text>
              <Text variant="bodyStrong" style={styles.item}>
                {line.item}
              </Text>
            </View>
          ))}

          <Text variant="sectionTitle" style={styles.heading}>
            method
          </Text>
          {recipe.method.map((step, i) => (
            <View key={step} style={styles.step}>
              <Text variant="sectionTitle" color={colors.divider} style={styles.stepNumber}>
                {i + 1}
              </Text>
              <Text variant="bodyStrong" style={styles.stepText}>
                {step}
              </Text>
            </View>
          ))}
        </View>
      </ScreenScroll>

      <IconButton
        name="chevron-back"
        onPress={() => router.back()}
        accessibilityLabel="Go back"
        style={styles.back}
      />

      <IconButton
        name={isSaved ? 'bookmark' : 'bookmark-outline'}
        size={64}
        iconSize={26}
        onPress={() => toggleSavedRecipe(recipe.id)}
        accessibilityLabel={isSaved ? 'Remove from saved' : 'Save recipe'}
        style={styles.saveFab}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
  hero: {
    marginHorizontal: screenPadding,
    marginTop: screenPadding,
    aspectRatio: 0.92,
    borderRadius: radii.lg,
    backgroundColor: colors.divider,
  },
  body: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing['2xl'],
  },
  subtitle: {
    marginTop: 2,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing['4xl'],
    marginTop: spacing['2xl'],
  },
  stat: {
    minWidth: 78,
  },
  statLabel: {
    marginTop: 2,
    letterSpacing: 0.6,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.dividerStrong,
    marginVertical: spacing['2xl'],
  },
  heading: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  ingredient: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  amount: {
    width: 90,
  },
  item: {
    flex: 1,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  stepNumber: {
    width: 42,
  },
  stepText: {
    flex: 1,
  },
  back: {
    position: 'absolute',
    top: 56,
    left: screenPadding,
  },
  saveFab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing['4xl'],
  },
});
