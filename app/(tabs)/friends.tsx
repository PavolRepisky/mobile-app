import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FriendCard } from '@/components/FriendCard';
import { IconButton } from '@/components/IconButton';
import { ScreenScroll } from '@/components/Screen';
import { spacing, tabBarTop } from '@/constants/theme';
import { FRIENDS } from '@/data/content';

/**
 * The people you're doing it with, with a `+` to invite more. The tab bar names
 * the page, so it opens straight on the first card.
 */
export default function FriendsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    // Absolute overlays need a positioned parent, otherwise their offsets
    // resolve against the scroll content instead of the screen.
    <View style={styles.screenRoot}>
      <ScreenScroll tabBar>
        <View style={styles.sections}>
          {FRIENDS.map((friend) => (
            <FriendCard
              key={friend.id}
              friend={friend}
              onPress={() => router.push({ pathname: '/friend/[id]', params: { id: friend.id } })}
              style={styles.friendCard}
            />
          ))}
        </View>
      </ScreenScroll>

      <IconButton
        name="add"
        size={64}
        iconSize={30}
        onPress={() => router.push('/invite')}
        accessibilityLabel="Invite a friend"
        style={[styles.fab, { bottom: tabBarTop(insets.bottom) + spacing.lg }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
  sections: {
    gap: spacing['3xl'],
  },
  friendCard: {
    marginBottom: 0,
  },
  // `bottom` is set at render: it tracks the tab bar, which rides the
  // home-indicator inset.
  fab: {
    position: 'absolute',
    right: spacing.xl,
  },
});
