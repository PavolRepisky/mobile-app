import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';

import { DaysFeed } from '@/components/DaysFeed';
import { FriendCard } from '@/components/FriendCard';
import { type Friend } from '@/data/content';
import { orderBySlot, useApp, usePostedDays } from '@/hooks/useAppState';
import { useSession } from '@/hooks/useSession';
import { useSocial } from '@/hooks/useSocial';
import { pastRunAuthor, pastRunPosted } from '@/lib/profileDays';

/** The era you're in now, as a feed key's era half. */
const NOW = 'now';

/**
 * Your own days — `DaysFeed`, the same feed anyone else's days open in,
 * landing on the tile that was tapped. It runs through the grid's days in
 * the grid's order: the era you're in, then each one before it, so paging
 * down from any tile lands on the tile after it. `run` names the past era a
 * tapped day belongs to; without it the day is the current era's.
 *
 * Each day is the same `FriendCard` the Community tab posts your day with, so
 * a post looks the same wherever you meet it: the carousel, the "Day N"
 * stamped across its photo grid, the like and the comment sheet. Keyed
 * `day-N`, the same id Community's own card for today reads off, so a like or
 * a comment left in either place shows in both.
 */
export default function DayPostScreen() {
  const { day: dayParam, run } = useLocalSearchParams<{ day: string; run?: string }>();
  const openedDay = Number(dayParam) || 1;
  const postedDays = usePostedDays();

  const { profile, tasks, progress, captions, currentDay, membershipId, challenge, inChallenge, reload } =
    useApp();
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const { page, loadPage } = useSocial();
  const pastRuns = useMemo(() => (userId ? page(userId)?.pastRuns : undefined) ?? [], [page, userId]);

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
      tasks: [],
      // Your days are posts like anyone's: what's said and felt about them
      // is kept against your membership.
      membershipId: membershipId ?? undefined,
      challengeId: challenge.id,
      challengeName: challenge.name,
    }),
    [profile, currentDay, membershipId, challenge],
  );

  // Every day in the grid, as `era:day`.
  const openedKey = `${run ?? NOW}:${openedDay}`;
  const keys = useMemo(() => {
    const all = [
      ...(inChallenge ? postedDays.map((day) => `${NOW}:${day}`) : []),
      ...pastRuns.flatMap((r) => pastRunPosted(r).map((day) => `${r.membershipId}:${day}`)),
    ];
    // A day reached by a link rather than a tap on the grid — nothing
    // photographed yet, say — has no neighbours in the feed to scroll onto,
    // so it shows just itself.
    return all.includes(openedKey) ? all : [openedKey];
  }, [inChallenge, postedDays, pastRuns, openedKey]);

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
      onRefresh={() => Promise.all([reload(), userId ? loadPage(userId) : null])}
      days={keys}
      openedDay={openedKey}
      renderDay={(key) => {
        const [era, dayText] = key.split(':');
        const day = Number(dayText);
        if (era === NOW) {
          return (
            <FriendCard
              friend={me}
              post={{ id: `day-${day}`, day, tasks: tasksFor(day), caption: captions[day] }}
            />
          );
        }
        const past = pastRuns.find((r) => r.membershipId === era);
        const record = past?.days.find((d) => d.day === day);
        if (!past || !record) return null;
        return (
          <FriendCard
            friend={pastRunAuthor(me, past)}
            post={{ id: `${era}-day${day}`, day, tasks: record.tasks, caption: record.caption }}
          />
        );
      }}
    />
  );
}
