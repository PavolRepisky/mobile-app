import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet } from '@/components/BottomSheet';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { MasonryGrid } from '@/components/MasonryGrid';
import { RecipeCard } from '@/components/RecipeCard';
import { ScreenScroll } from '@/components/Screen';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { spacing, tabBarTop } from '@/constants/theme';
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
  const insets = useSafeAreaInsets();
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
      {/* The category row is this screen's header, so it sits nearer the
          status bar than a headline screen's default gap allows. */}
      <ScreenScroll tabBar topGap={spacing.sm}>
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

        {visible.length ? (
          <MasonryGrid
            items={visible}
            keyExtractor={(recipe) => recipe.id}
            weight={(recipe) => (recipe.tall ? 1.35 : 1)}
            renderItem={(recipe) => (
              <RecipeCard recipe={recipe} onPress={() => open(recipe)} />
            )}
            style={styles.grid}
          />
        ) : (
          <EmptyState
            icon="restaurant-outline"
            title="Nothing here yet"
            hint="No recipes in this category"
          />
        )}
      </ScreenScroll>

      <IconButton
        name="bookmark"
        size={64}
        iconSize={26}
        onPress={() => setSavedOpen(true)}
        accessibilityLabel="Saved recipes"
        style={[styles.fab, { bottom: tabBarTop(insets.bottom) + spacing.lg }]}
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
          size="lg"
          align="justify"
          dense
          style={styles.sheetTabs}
        />

        {saved.length ? (
          <MasonryGrid
            items={saved}
            keyExtractor={(recipe) => recipe.id}
            weight={(recipe) => (recipe.tall ? 1.35 : 1)}
            renderItem={(recipe) => (
              <RecipeCard recipe={recipe} onPress={() => open(recipe)} />
            )}
            style={styles.grid}
          />
        ) : (
          <EmptyState
            icon="bookmark"
            title={
              savedRecipeIds.length
                ? 'Nothing saved here yet'
                : 'No saved recipes yet'
            }
            hint={
              savedRecipeIds.length
                ? 'Nothing saved in this category'
                : 'Tap the bookmark on a recipe to save it'
            }
          />
        )}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  tabsWrap: {
    paddingBottom: spacing.lg,
    marginHorizontal: -spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  sheetTabs: {
    marginBottom: spacing.md,
  },
  grid: {
    marginTop: spacing.sm,
  },
  // `bottom` is set at render: it tracks the tab bar, which rides the
  // home-indicator inset.
  fab: {
    position: 'absolute',
    right: spacing.xl,
  },
});
