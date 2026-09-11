import { StyleSheet } from 'react-native';
import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';

import { FloatingTabBar, TabBarButton } from '@/components/FloatingTabBar';
import { useApp } from '@/hooks/useAppState';

/**
 * Headless tabs so the bar can be a floating pill drawn over the content
 * rather than a docked bar that shortens it.
 *
 * Bar order is Challenges · Community · To do · Calendar · Profile: the two
 * social pages lead, then the day itself, then Calendar beside the page it
 * belongs to — the month grid of proof photos is the to-do list's own
 * history. Challenges and Community were one screen behind a switch until
 * they earned a tab each. To do is the app's real home, so it is the initial
 * route, and it is the one tab drawn as a filled disc.
 */
export default function TabsLayout() {
  const { tabBarHidden } = useApp();

  return (
    // `flex: 1` on both the root and the slot keeps each screen exactly one
    // viewport tall, so scroll views scroll internally and absolutely
    // positioned overlays land on the screen rather than at the end of the
    // content.
    <Tabs options={{ backBehavior: 'history' }} style={styles.root}>
      <TabSlot style={styles.slot} />

      <TabList asChild>
        <FloatingTabBar hidden={tabBarHidden}>
          <TabTrigger name="discover" href="/discover" asChild>
            <TabBarButton icon="discover" label="Challenges" />
          </TabTrigger>

          <TabTrigger name="community" href="/community" asChild>
            <TabBarButton icon="community" label="Community" />
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
