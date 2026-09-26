import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FriendCard } from '@/components/FriendCard';
import { IconButton } from '@/components/IconButton';
import { profileActionHeight, profileActionTop } from '@/components/ProfileLayout';
import { ScreenScroll, topPadding } from '@/components/Screen';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { Text } from '@/components/Text';
import { colors, screenPadding, spacing } from '@/constants/theme';
import { FEED_AUTHORS, FRIENDS, type Friend } from '@/data/content';
import { useApp } from '@/hooks/useAppState';

type Tab = 'friends' | 'members';

/** Matches the corner "+" on Challenges, so every tab root's corner button
 * is the same size. */
const CORNER_SIZE = 46;

/**
 * The people you're doing it with: your own friends' days in one feed, and
 * everyone else posting in the same challenge in the same feed shape under
 * Members — the same `FriendCard` post, just posted by people you haven't
 * added rather than people you have. The title band is Challenges' own, with
 * Find friends in the corner where Challenges keeps its "+": finding people
 * is this tab's job, so the way to add them lives here rather than on the
 * profile.
 *
 * Every post's photo sits behind `FriendCard`'s own lock until the account
 * has proven today with one photographed task of its own — reading everyone
 * else's day is a thing you earn by starting yours, not a free scroll before
 * you've done anything. The identity row, actions and caption stay plain
 * underneath it either way.
 */
export default function CommunityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { hasPhotographedTask, profile, tasks, progress, currentDay, trophies, livesLeft } =
    useApp();
  const [tab, setTab] = useState<Tab>('friends');

  // The shared line the title and the corner button sit on — see Challenges.
  const headerTop = Math.max(profileActionTop, topPadding(insets.top));
  const titleOffset = headerTop - topPadding(insets.top);

  const openProfile = (id: string) =>
    router.push({ pathname: '/friend/[id]', params: { id } });

  // Your own day, in the same `Friend` shape a card already knows how to
  // draw — pinned ahead of the feed once there's a real post to show numbers
  // on. `day-${currentDay}` is the same key Profile's own grid tile already
  // hashes its like count from, so the number here doesn't drift from the
  // one already shown there. Unlocked and un-tappable on the identity row:
  // it's your post, not a stranger's profile to open. The name reads "You"
  // rather than your real name — that alone marks the card as yours, so it
  // needs no separate badge.
  const myPost: Friend | null = useMemo(() => {
    if (!hasPhotographedTask) return null;
    return {
      id: `day-${currentDay}`,
      name: 'You',
      handle: profile.handle,
      avatar: profile.avatar ?? profile.avatarSeed,
      day: currentDay,
      bio: profile.bio,
      friendCount: FRIENDS.length,
      trophies,
      livesLeft,
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
    // Absolute overlays need a positioned parent, otherwise their offsets
    // resolve against the scroll content instead of the screen.
    <View style={styles.screenRoot}>
      <ScreenScroll tabBar>
        <View style={[styles.titleBand, { marginTop: titleOffset }]}>
          <Text variant="sectionTitle" center>
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
          {myPost ? <FriendCard friend={myPost} locked={false} style={styles.friendCard} /> : null}
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

      <IconButton
        name="person-add-outline"
        size={CORNER_SIZE}
        iconSize={20}
        background={colors.surface}
        onPress={() => router.push('/add-friends')}
        accessibilityLabel="Find friends"
        style={[styles.corner, { top: headerTop }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
  corner: {
    position: 'absolute',
    right: screenPadding,
  },
  titleBand: {
    minHeight: profileActionHeight,
    justifyContent: 'center',
    marginBottom: spacing.xl,
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
