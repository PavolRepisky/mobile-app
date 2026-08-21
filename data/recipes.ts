import type { ImageSourcePropType } from 'react-native';

export type RecipeCategory = 'mornings' | 'lunch' | 'snacks' | 'dinners';

export interface Recipe {
  id: string;
  name: string;
  subtitle: string;
  category: RecipeCategory;
  minutes: number;
  servings: number;
  /** Bundled photo for the masonry tile and the detail hero. */
  image: ImageSourcePropType;
  /** Drives the card's aspect ratio in the masonry. */
  tall?: boolean;
  ingredients: readonly { amount: string; item: string }[];
  method: readonly string[];
}

export const RECIPES: readonly Recipe[] = [
  {
    id: 'salmon-wrap',
    name: 'salmon wrap',
    subtitle: 'with cream cheese & avocado',
    category: 'lunch',
    minutes: 8,
    servings: 1,
    image: require('../assets/recipes/salmon-wrap.jpg'),
    tall: true,
    ingredients: [
      { amount: '1', item: 'large tortilla' },
      { amount: '3 tbsp', item: 'cream cheese' },
      { amount: '1/2', item: 'avocado' },
      { amount: '80 g', item: 'smoked salmon' },
      { amount: 'handful', item: 'green lettuce' },
    ],
    method: [
      'Spread cream cheese across the tortilla.',
      'Fan the avocado over one half.',
      'Layer the salmon and lettuce.',
      'Roll tight and slice on the diagonal.',
    ],
  },
  {
    id: 'cottage-bowl',
    name: 'cottage bowl',
    subtitle: 'with cucumber & cherry tomato',
    category: 'snacks',
    minutes: 5,
    servings: 1,
    image: require('../assets/recipes/cottage-bowl.jpg'),
    ingredients: [
      { amount: '150 g', item: 'cottage cheese' },
      { amount: '1/2', item: 'cucumber' },
      { amount: '6', item: 'cherry tomatoes' },
      { amount: 'pinch', item: 'cracked pepper' },
    ],
    method: [
      'Spoon the cottage cheese into a shallow bowl.',
      'Batton the cucumber and halve the tomatoes.',
      'Arrange around the cheese and season.',
    ],
  },
  {
    id: 'salmon-tartine',
    name: 'salmon tartine',
    subtitle: 'with mozzarella pearls & blueberries',
    category: 'mornings',
    minutes: 6,
    servings: 1,
    image: require('../assets/recipes/salmon-tartine.jpg'),
    ingredients: [
      { amount: '2 slices', item: 'sourdough' },
      { amount: '60 g', item: 'smoked salmon' },
      { amount: '8', item: 'mozzarella pearls' },
      { amount: 'handful', item: 'blueberries' },
      { amount: 'pinch', item: 'dried dill' },
    ],
    method: [
      'Toast the sourdough until just golden.',
      'Drape the salmon over each slice.',
      'Scatter the pearls and berries alongside.',
      'Finish with dill.',
    ],
  },
  {
    id: 'apricot-salad',
    name: 'apricot salad',
    subtitle: 'with basil & cashews',
    category: 'lunch',
    minutes: 7,
    servings: 1,
    image: require('../assets/recipes/apricot-salad.jpg'),
    tall: true,
    ingredients: [
      { amount: '3', item: 'apricots' },
      { amount: 'handful', item: 'basil leaves' },
      { amount: '30 g', item: 'cashews' },
      { amount: '1 tbsp', item: 'olive oil' },
    ],
    method: [
      'Halve and stone the apricots.',
      'Toss with basil and cashews.',
      'Dress with olive oil and a little salt.',
    ],
  },
  {
    id: 'avo-toast',
    name: 'avo toast',
    subtitle: 'with soft eggs & pomegranate',
    category: 'mornings',
    minutes: 12,
    servings: 1,
    image: require('../assets/recipes/avo-toast.jpg'),
    tall: true,
    ingredients: [
      { amount: '2 slices', item: 'seeded bread' },
      { amount: '1', item: 'avocado' },
      { amount: '2', item: 'eggs' },
      { amount: '2 tbsp', item: 'pomegranate seeds' },
      { amount: 'handful', item: 'lamb’s lettuce' },
    ],
    method: [
      'Boil the eggs for 7 minutes, then cool and peel.',
      'Crush the avocado onto the toast.',
      'Halve the eggs and set alongside.',
      'Scatter pomegranate and lettuce.',
    ],
  },
  {
    id: 'soft-eggs',
    name: 'soft eggs',
    subtitle: 'with buttered mushrooms',
    category: 'mornings',
    minutes: 10,
    servings: 1,
    image: require('../assets/recipes/soft-eggs.jpg'),
    tall: true,
    ingredients: [
      { amount: '3', item: 'eggs' },
      { amount: '150 g', item: 'chestnut mushrooms' },
      { amount: '1 tbsp', item: 'butter' },
    ],
    method: [
      'Fry the mushrooms in butter until deep gold.',
      'Scramble the eggs low and slow.',
      'Plate together and season.',
    ],
  },
  {
    id: 'egg-crepe',
    name: 'egg crepe',
    subtitle: 'with ham & spinach',
    category: 'mornings',
    minutes: 8,
    servings: 1,
    image: require('../assets/recipes/egg-crepe.jpg'),
    ingredients: [
      { amount: '2', item: 'eggs' },
      { amount: '2 slices', item: 'ham' },
      { amount: 'handful', item: 'spinach' },
      { amount: '1 slice', item: 'cheese' },
    ],
    method: [
      'Beat the eggs and pour into a wide pan.',
      'Lay the ham, cheese and spinach on one half.',
      'Fold over and cook until set.',
    ],
  },
  {
    id: 'fig-oatmeal',
    name: 'fig oatmeal',
    subtitle: 'with raspberries',
    category: 'mornings',
    minutes: 9,
    servings: 1,
    image: require('../assets/recipes/fig-oatmeal.jpg'),
    ingredients: [
      { amount: '50 g', item: 'rolled oats' },
      { amount: '200 ml', item: 'milk of choice' },
      { amount: '2', item: 'figs' },
      { amount: 'handful', item: 'raspberries' },
    ],
    method: [
      'Simmer the oats with the milk until creamy.',
      'Fan the figs across the top.',
      'Finish with raspberries.',
    ],
  },
];

export const RECIPE_CATEGORIES = [
  { key: 'mornings', label: 'Mornings' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'snacks', label: 'Snacks' },
  { key: 'dinners', label: 'Dinners' },
] as const;

export function recipeById(id: string): Recipe | undefined {
  return RECIPES.find((r) => r.id === id);
}
