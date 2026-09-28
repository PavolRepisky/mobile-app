import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ProfileView, type ProfileDay } from '@/components/ProfileView';
import { ScreenScroll } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PEOPLE } from '@/data/content';
import { useApp } from '@/hooks/useAppState';

const DAY_MS = 86_400_000;

/**
 * A friend's or a challenge member's profile, opened from the Community tab,
 * a story, or who posted in a challenge feed. It is your own Profile page —
 * `ProfileView`, the same ring, card and days — with "Lily's Profile" as the title
 * and the way back in place of Settings, since there's nothing here to edit.
 */
export default function FriendProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { challenge, totalDays } = useApp();

  const friend = PEOPLE.find((f) => f.id === String(id)) ?? PEOPLE[0];

  // Their day today plus every earlier one they've shared, by challenge day.
  // Days they haven't shared aren't known here, so they stay out of the map
  // and read as blank on the calendar rather than as missed.
  const days = useMemo(() => {
    const byDay = new Map<number, ProfileDay>();
    for (const { day, tasks } of [
      { day: friend.day, tasks: friend.tasks },
      ...(friend.pastPosts ?? []),
    ]) {
      byDay.set(day, {
        shots: tasks.flatMap((task) =>
          task.photo || task.photoSeed
            ? [{ key: task.label, photo: task.photo ?? null, seed: task.photoSeed ?? null }]
            : [],
        ),
        done: tasks.filter((task) => task.done).length,
      });
    }
    return byDay;
  }, [friend]);
  const dayOf = useCallback((day: number) => days.get(day) ?? null, [days]);

  const taskCount = friend.tasks.length;
  const todayRecord = days.get(friend.day);
  const hasStoryToday = Boolean(todayRecord?.shots.length);

  // Your grid's own rule: every earlier day with a photo, most recent first,
  // and today only once it's finished — until then it's a story, and the
  // ring shows it.
  const posted = [...days.entries()]
    .filter(
      ([day, record]) =>
        record.shots.length > 0 && (day < friend.day || record.done === taskCount),
    )
    .map(([day]) => day)
    .sort((a, b) => b - a);

  // They're in the same challenge, on their own day of it, so their start is
  // counted back from today. A long run can take them past your length.
  const startDate = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return new Date(start.getTime() - (friend.day - 1) * DAY_MS);
  }, [friend.day]);

  const playStory = useCallback(
    () => router.push({ pathname: '/story', params: { friend: friend.id } }),
    [router, friend.id],
  );
  const openDay = useCallback(
    (day: number) =>
      router.push({
        pathname: '/friend/post/[id]',
        params: { id: friend.id, day: String(day) },
      }),
    [router, friend.id],
  );
  // Their today is being done somewhere you can't see — its cell plays their
  // story, the way the photo does, once there's one to play.
  const today = useMemo(
    () => (hasStoryToday ? { onPress: playStory, hint: 'Plays their story.' } : undefined),
    [hasStoryToday, playStory],
  );

  // Set like your own "My Profile", so the two titles read as a pair. A
  // name ending in "s" takes the apostrophe alone.
  const title = `${friend.name}${/s$/i.test(friend.name) ? "'" : "'s"} Profile`;

  return (
    <View style={styles.screenRoot}>
      {/* Every pushed page's fixed bar: the way back, then whose profile
          this is. */}
      <ScreenScroll tone="plain" header={<ScreenHeader bar plainTitle={title} />}>
        <ProfileView
          avatar={friend.avatar}
          name={friend.name}
          handle={friend.handle}
          bio={friend.bio}
          challenge={challenge}
          startDate={startDate}
          currentDay={friend.day}
          totalDays={Math.max(totalDays, friend.day)}
          taskCount={taskCount}
          dayOf={dayOf}
          posted={posted}
          onPlayStory={hasStoryToday ? playStory : undefined}
          onOpenDay={openDay}
          today={today}
          emptyHint={`${friend.name} hasn't finished a day yet.`}
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
