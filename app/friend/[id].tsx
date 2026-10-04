import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { Share, StyleSheet, View } from 'react-native';

import { ProfileView, type ProfileDay } from '@/components/ProfileView';
import { ScreenScroll } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useRelation, useSocial } from '@/hooks/useSocial';
import { possessive } from '@/lib/names';

/**
 * A friend's or a challenge member's profile, opened from the Community tab,
 * a story, Find friends, or who posted in a challenge feed. It is your own
 * Profile page — `ProfileView`, the same ring, card and days — with
 * "Lily's Profile" as the title and the way back in place of Settings, since
 * there's nothing here to edit.
 *
 * Whoever Community already loaded shows at once; their whole run — every
 * earlier day — fills in as it arrives. Their today keeps to the Community
 * lock: until you've proven your own, its photos don't come through.
 */
export default function FriendProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = String(id);
  const router = useRouter();
  const social = useSocial();
  const { loadPage, accept, toggleRequest } = social;
  const relation = useRelation(userId);

  useEffect(() => {
    loadPage(userId);
  }, [userId, loadPage]);

  const page = social.page(userId);
  const friend = page?.person ?? social.person(userId);

  const days = useMemo(() => {
    const byDay = new Map<number, ProfileDay>();
    const records = page?.days ?? (friend ? [{ day: friend.day, tasks: friend.tasks }] : []);
    for (const { day, tasks } of records) {
      byDay.set(day, {
        // Tiles on the grid and calendar are small: thumbnails where there
        // are any.
        shots: tasks.flatMap((task) =>
          task.photo || task.photoSeed
            ? [{ key: task.label, photo: task.thumb ?? task.photo ?? null, seed: task.photoSeed ?? null }]
            : [],
        ),
        done: tasks.filter((task) => task.done).length,
      });
    }
    return byDay;
  }, [page, friend]);
  const dayOf = useCallback((day: number) => days.get(day) ?? null, [days]);

  const taskCount = friend?.tasks.length ?? 0;
  const today = friend?.day ?? 0;
  const hasStoryToday = Boolean(days.get(today)?.shots.length);

  const posted = [...days.entries()]
    .filter(([day, record]) => record.shots.length > 0 && (day < today || record.done === taskCount))
    .map(([day]) => day)
    .sort((a, b) => b - a);

  const playStory = useCallback(
    () => router.push({ pathname: '/story', params: { friend: userId } }),
    [router, userId],
  );
  const openDay = useCallback(
    (day: number) =>
      router.push({ pathname: '/friend/post/[id]', params: { id: userId, day: String(day) } }),
    [router, userId],
  );
  const todayCell = useMemo(
    () => (hasStoryToday ? { onPress: playStory, hint: 'Plays their story.' } : undefined),
    [hasStoryToday, playStory],
  );

  if (!friend) {
    // Nothing loaded yet: the bar, so the way back is there from the start.
    return (
      <View style={styles.screenRoot}>
        <ScreenScroll tone="plain" header={<ScreenHeader plainTitle="Profile" />}>
          {null}
        </ScreenScroll>
      </View>
    );
  }

  const title = `${possessive(friend.name)} Profile`;

  // What the first button says follows where you stand with them: already
  // friends, asked by them (one tap accepts), asked by you, or neither.
  const relationAction = relation.isFriend
    ? { label: 'Friends' }
    : relation.requestReceived
      ? { label: 'Accept request', onPress: () => accept(userId) }
      : {
          label: relation.requestSent ? 'Request sent' : 'Add friend',
          onPress: () => toggleRequest(userId),
        };
  const actions = [
    relationAction,
    {
      label: 'Share profile',
      onPress: () => {
        Share.share({ message: `${friend.name} (${friend.handle}) on Her 75` }).catch(() => {});
      },
    },
  ];

  return (
    <View style={styles.screenRoot}>
      {/* Every pushed page's fixed bar: the way back, then whose profile
          this is. */}
      <ScreenScroll tone="plain" header={<ScreenHeader plainTitle={title} />}>
        <ProfileView
          avatar={friend.avatar}
          name={friend.name}
          handle={friend.handle}
          bio={friend.bio}
          challenge={page?.challenge ?? null}
          startDate={page?.startDate ?? new Date()}
          currentDay={today}
          totalDays={page?.totalDays ?? today}
          taskCount={taskCount}
          dayOf={dayOf}
          posted={posted}
          onPlayStory={hasStoryToday ? playStory : undefined}
          onOpenDay={openDay}
          today={todayCell}
          emptyHint={`${friend.name} hasn't finished a day yet.`}
          daysTitle={`${possessive(friend.name)} days`}
          actions={actions}
        />
      </ScreenScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
});
