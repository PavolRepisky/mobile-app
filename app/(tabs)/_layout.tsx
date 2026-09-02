import { StyleSheet } from 'react-native';
import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';

import { FloatingTabBar, TabBarButton } from '@/components/FloatingTabBar';

/**
 * Headless tabs so the bar can be a floating pill drawn over the content
 * rather than a docked bar that shortens it.
 *
 * Bar order follows the reference (Recipes · Friends · To do · Profile) with
 * Calendar slotted beside the page it belongs to — the month grid of proof
 * photos is the to-do list's own history. To do is the app's real home, so it
 * is the initial route, and it is the one tab drawn as a filled disc.
 */
export default function TabsLayout() {
  return (
    // `flex: 1` on both the root and the slot keeps each screen exactly one
    // viewport tall, so scroll views scroll internally and absolutely
    // positioned overlays land on the screen rather than at the end of the
    // content.
    <Tabs options={{ backBehavior: 'history' }} style={styles.root}>
      <TabSlot style={styles.slot} />

      <TabList asChild>
        <FloatingTabBar>
          <TabTrigger name="recipes" href="/recipes" asChild>
            <TabBarButton icon="recipes" label="Recipes" />
          </TabTrigger>

          <TabTrigger name="friends" href="/friends" asChild>
            <TabBarButton icon="friends" label="Friends" />
          </TabTrigger>

          <TabTrigger name="todo" href="/todo" asChild>
            <TabBarButton icon="todo" label="To do" filled />
          </TabTrigger>

          <TabTrigger name="calendar" href="/calendar" asChild>
            <TabBarButton icon="calendar" label="Calendar" />
          </TabTrigger>

          <TabTrigger name="profile" href="/profile" asChild>
            <TabBarButton icon="profile" label="Profile" />
          </TabTrigger>
        </FloatingTabBar>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  slot: {
    flex: 1,
  },
});
