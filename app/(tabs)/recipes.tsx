import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { IconButton } from '@/components/IconButton';
import { MasonryGrid } from '@/components/MasonryGrid';
import { RecipeCard } from '@/components/RecipeCard';
import { ScreenScroll } from '@/components/Screen';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { spacing, tabBarClearance } from '@/constants/theme';
import { RECIPES, RECIPE_CATEGORIES, type Recipe } from '@/data/recipes';
import { useApp } from '@/hooks/useAppState';

type Filter = 'all' | Recipe['category'];

/**
 * Masonry recipe grid with category filters. The bookmark FAB raises a sheet
 * holding the saved recipes, which carries its own filter row with a leading
 * bookmark chip.
 */
export default function RecipesScreen() {
  const router = useRouter();
  const { savedRecipeIds } = useApp();

  const [filter, setFilter] = useState<Filter>('all');
  const [savedOpen, setSavedOpen] = useState(false);
  const [savedFilter, setSavedFilter] = useState<Filter>('all');

  const visible = useMemo(
    () => (filter === 'all' ? RECIPES : RECIPES.filter((r) => r.category === filter)),
    [filter],
  );

  const saved = useMemo(() => {
    const list = RECIPES.filter((r) => savedRecipeIds.includes(r.id));
    return savedFilter === 'all'
      ? list
      : list.filter((r) => r.category === savedFilter);
  }, [savedRecipeIds, savedFilter]);

  const open = (recipe: Recipe) => {
    setSavedOpen(false);
    router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } });
  };

  return (
    // Explicit flex container so the FAB's absolute offsets resolve against the
    // screen rather than the (much taller) scroll content.
    <View style={styles.root}>
      <ScreenScroll tabBar>
        <View style={styles.tabsWrap}>
          <SegmentedTabs
            options={[
              { key: 'all', label: 'All' },
              ...RECIPE_CATEGORIES.map((c) => ({ key: c.key, label: c.label })),
            ]}
            value={filter}
            onChange={(key) => setFilter(key as Filter)}
            scrollable
            size="lg"
            align="left"
          />
        </View>

        <MasonryGrid
          items={visible}
          keyExtractor={(recipe) => recipe.id}
          weight={(recipe) => (recipe.tall ? 1.35 : 1)}
          renderItem={(recipe) => (
            <RecipeCard recipe={recipe} onPress={() => open(recipe)} />
          )}
          style={styles.grid}
        />
      </ScreenScroll>

      <IconButton
        name="bookmark"
        size={64}
        iconSize={26}
        onPress={() => setSavedOpen(true)}
        accessibilityLabel="Saved recipes"
        style={styles.fab}
      />

      <BottomSheet
        visible={savedOpen}
        onDismiss={() => setSavedOpen(false)}
        tall
        handle={false}
      >
        <SegmentedTabs
          options={[
            { key: 'all', label: 'Saved', icon: 'bookmark' },
            ...RECIPE_CATEGORIES.map((c) => ({ key: c.key, label: c.label })),
          ]}
          value={savedFilter}
          onChange={(key) => setSavedFilter(key as Filter)}
          scrollable
          size="lg"
          align="left"
        />

        <MasonryGrid
          items={saved}
          keyExtractor={(recipe) => recipe.id}
          weight={(recipe) => (recipe.tall ? 1.35 : 1)}
          renderItem={(recipe) => (
            <RecipeCard recipe={recipe} onPress={() => open(recipe)} />
          )}
          style={styles.grid}
        />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  tabsWrap: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    marginHorizontal: -spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  grid: {
    marginTop: spacing.sm,
  },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: tabBarClearance + spacing.xl,
  },
});
