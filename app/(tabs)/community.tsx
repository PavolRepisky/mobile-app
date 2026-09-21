import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FriendCard } from '@/components/FriendCard';
import { ScreenScroll } from '@/components/Screen';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { Text } from '@/components/Text';
import { spacing } from '@/constants/theme';
import { FEED_AUTHORS, FRIENDS, type Friend } from '@/data/content';
import { useApp } from '@/hooks/useAppState';

type Tab = 'friends' | 'members';

/**
 * The people you're doing it with: your own friends' days in one feed, and
 * everyone else posting in the same challenge in the same feed shape under
 * Members — the same `FriendCard` post, just posted by people you haven't
 * added rather than people you have. The header is Profile's own — same row,
 * same centred title — with no icons either side of it: there's nothing here
 * for a corner button to do.
 *
 * Every post's photo sits behind `FriendCard`'s own lock until the account
 * has proven today with one photographed task of its own — reading everyone
 * else's day is a thing you earn by starting yours, not a free scroll before
 * you've done anything. The identity row, actions and caption stay plain
 * underneath it either way.
 */
export default function CommunityScreen() {
  const router = useRouter();
  const { hasPhotographedTask, profile, tasks, progress, currentDay, trophies, livesLeft } =
    useApp();
  const [tab, setTab] = useState<Tab>('friends');

  const openProfile = (id: string) =>
    router.push({ pathname: '/friend/[id]', params: { id } });

  // Your own day, in the same `Friend` shape a card already knows how to
  // draw — pinned ahead of the feed once there's a real post to show numbers
  // on. `day-${currentDay}` is the same key Profile's own grid tile already
  // hashes its like count from, so the number here doesn't drift from the
  // one already shown there. Unlocked and un-tappable on the identity row:
  // it's your post, not a stranger's profile to open.
  const myPost: Friend | null = useMemo(() => {
    if (!hasPhotographedTask) return null;
    return {
      id: `day-${currentDay}`,
      name: profile.name,
      handle: profile.handle,
      avatar: profile.avatar ?? profile.avatarSeed,
      day: currentDay,
      bio: profile.bio,
      friendCount: FRIENDS.length,
      trophies,
      livesLeft,
      socials: profile.socials,
      tasks: tasks.map((task) => {
        const entry = progress[currentDay]?.[task.id];
        return {
          label: task.label,
          done: entry?.done ?? false,
          time: entry?.time,
          photo: entry?.photo ?? undefined,
          photoSeed: entry?.photoSeed ?? undefined,
        };
      }),
    };
  }, [hasPhotographedTask, profile, tasks, progress, currentDay, trophies, livesLeft]);

  const posts = tab === 'friends' ? FRIENDS : FEED_AUTHORS;

  return (
    <ScreenScroll tabBar>
      <View style={styles.header}>
        <Text variant="sectionTitle" center style={styles.headerTitle}>
          Community
        </Text>
      </View>

      <SegmentedTabs
        options={[
          { key: 'friends', label: 'Friends' },
          { key: 'members', label: 'Members' },
        ]}
        value={tab}
        onChange={setTab}
        align="left"
        style={styles.tabs}
      />

      <View style={styles.sections}>
        {myPost ? (
          <FriendCard friend={myPost} locked={false} own style={styles.friendCard} />
        ) : null}
        {posts.map((person) => (
          <FriendCard
            key={person.id}
            friend={person}
            onPress={() => openProfile(person.id)}
            locked={!hasPhotographedTask}
            style={styles.friendCard}
          />
        ))}
      </View>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  // Profile tab's own header row, reused exactly: same spacing, same
  // centred title. No icons either side — there's no corner action here.
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerTitle: {
    flex: 1,
  },
  tabs: {
    marginBottom: spacing['2xl'],
  },
  sections: {
    gap: spacing['3xl'],
  },
  friendCard: {
    marginBottom: 0,
  },
});
