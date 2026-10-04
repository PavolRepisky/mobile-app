import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';

import { DaysFeed } from '@/components/DaysFeed';
import { FriendCard } from '@/components/FriendCard';
import { FRIENDS, type Friend } from '@/data/content';
import { orderBySlot, useApp, usePostedDays } from '@/hooks/useAppState';

/**
 * Your own days — `DaysFeed`, the same feed anyone else's days open in,
 * landing on the tile that was tapped.
 *
 * Each day is the same `FriendCard` the Community tab posts your day with, so
 * a post looks the same wherever you meet it: the carousel, the "Day N"
 * stamped across its photo grid, the like and the comment sheet. Keyed
 * `day-N`, the same id Community's own card for today reads off, so a like or
 * a comment left in either place shows in both.
 */
export default function DayPostScreen() {
  const { day: dayParam } = useLocalSearchParams<{ day: string }>();
  const openedDay = Number(dayParam) || 1;
  const postedDays = usePostedDays();
  // A day reached by a link rather than a tap on the grid — nothing
  // photographed yet, say — has no neighbours in the feed to scroll onto, so
  // it shows just itself.
  const days = postedDays.includes(openedDay) ? postedDays : [openedDay];

  const { profile, tasks, progress, captions, currentDay, livesLeft } = useApp();

  // You, in the same `Friend` shape Community builds for your own card —
  // only the identity row reads off it; each day's photos come in through
  // `post` below.
  const me: Friend = useMemo(
    () => ({
      id: `day-${currentDay}`,
      name: profile.name,
      handle: profile.handle,
      avatar: profile.avatar ?? profile.avatarSeed,
      day: currentDay,
      bio: profile.bio,
      friendCount: FRIENDS.length,
      livesLeft,
      tasks: [],
    }),
    [profile, currentDay, livesLeft],
  );

  const tasksFor = (day: number): Friend['tasks'] =>
    orderBySlot(tasks, progress[day]).map((task) => {
      const entry = progress[day]?.[task.id];
      return {
        label: task.label,
        done: entry?.done ?? false,
        time: entry?.time,
        photo: entry?.photo ?? undefined,
        photoSeed: entry?.photoSeed ?? undefined,
      };
    });

  return (
    <DaysFeed
      title="My days"
      days={days}
      openedDay={openedDay}
      renderDay={(day) => (
        <FriendCard
          friend={me}
          post={{ id: `day-${day}`, day, tasks: tasksFor(day), caption: captions[day] }}
        />
      )}
    />
  );
}
