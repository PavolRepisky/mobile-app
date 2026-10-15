import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/components/ScreenHeader';

/**
 * The tab's own stack, there only so its page has the system navigation bar
 * with its title in it. Pages opened from the tab are
 * still pushed on the root stack, over the tab bar.
 */
export default function TabStackLayout() {
  return <Stack screenOptions={stackScreenOptions} />;
}
