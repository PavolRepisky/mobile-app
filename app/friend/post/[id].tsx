import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';

import { DaysFeed } from '@/components/DaysFeed';
import { FriendCard } from '@/components/FriendCard';
import { PEOPLE } from '@/data/content';
import { possessive } from '@/lib/names';

/**
 * A friend's or member's days, opened from their profile grid — `DaysFeed`,
 * the same feed your own "My days" scrolls through, landing on the tile that
 * was tapped. It holds exactly the days their grid does: every earlier day
 * with a photo, and today only once it's finished. Each day is the same
 * `FriendCard` the Community feed posts with.
 */
export default function FriendPostScreen() {
  const { id, day: dayParam } = useLocalSearchParams<{ id: string; day?: string }>();

  const friend = PEOPLE.find((f) => f.id === String(id)) ?? PEOPLE[0];
  const openedDay = Number(dayParam) || friend.day;

  const records = useMemo(() => {
    const taskCount = friend.tasks.length;
    return [
      { day: friend.day, tasks: friend.tasks, caption: friend.caption },
      ...(friend.pastPosts ?? []),
    ]
      .filter(
        ({ day, tasks }) =>
          tasks.some((task) => task.photo || task.photoSeed) &&
          (day < friend.day || tasks.filter((task) => task.done).length === taskCount),
      )
      .sort((a, b) => b.day - a.day);
  }, [friend]);

  // A day reached by a link rather than a tap on the grid has no neighbours
  // to scroll onto, so it shows just itself — My days' own rule.
  const days = useMemo(() => {
    const posted = records.map((record) => record.day);
    return posted.includes(openedDay) ? posted : [openedDay];
  }, [records, openedDay]);

  return (
    <DaysFeed
      title={`${possessive(friend.name)} days`}
      days={days}
      openedDay={openedDay}
      renderDay={(day) => {
        const record = records.find((r) => r.day === day);
        // No `onPress` — the avatar and name would only open the profile
        // this feed was already opened from.
        return (
          <FriendCard
            friend={friend}
            post={
              day === friend.day || !record
                ? undefined
                : { id: `${friend.id}-day${day}`, day, tasks: record.tasks, caption: record.caption }
            }
          />
        );
      }}
    />
  );
}
