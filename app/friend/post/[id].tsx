import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';

import { DaysFeed } from '@/components/DaysFeed';
import { FriendCard } from '@/components/FriendCard';
import { useSocial } from '@/hooks/useSocial';
import { possessive } from '@/lib/names';
import { pastRunAuthor, pastRunPosted } from '@/lib/profileDays';

/** The era they're in now, as a feed key's era half. */
const NOW = 'now';

/**
 * A friend's or member's days, opened from their profile grid — `DaysFeed`,
 * the same feed your own "My days" scrolls through, landing on the tile that
 * was tapped. It holds exactly the days their grid does, in its order: every
 * earlier day of the era they're in with a photo, today only once it's
 * finished, then the days of each era before it. `run` names the past era a
 * tapped day belongs to. Each day is the same `FriendCard` the Community feed
 * posts with.
 */
export default function FriendPostScreen() {
  const { id, day: dayParam, run } = useLocalSearchParams<{ id: string; day?: string; run?: string }>();
  const userId = String(id);
  const social = useSocial();
  const { loadPage } = social;
  const page = social.page(userId);

  // Opened from their profile, the page is already loaded; from a link it
  // isn't yet.
  useEffect(() => {
    if (!page) loadPage(userId);
  }, [page, userId, loadPage]);

  const friend = page?.person;
  const openedKey = `${run ?? NOW}:${Number(dayParam) || friend?.day || 1}`;

  const records = useMemo(() => {
    if (!friend || !page) return [];
    const taskCount = friend.tasks.length;
    return page.days
      .filter(
        ({ day, tasks }) =>
          tasks.some((task) => task.photo || task.photoSeed) &&
          (day < friend.day || tasks.filter((task) => task.done).length === taskCount),
      )
      .sort((a, b) => b.day - a.day);
  }, [friend, page]);

  // A day reached by a link rather than a tap on the grid has no neighbours
  // to scroll onto, so it shows just itself — My days' own rule.
  const keys = useMemo(() => {
    const all = [
      ...records.map((record) => `${NOW}:${record.day}`),
      ...(page?.pastRuns ?? []).flatMap((r) => pastRunPosted(r).map((day) => `${r.membershipId}:${day}`)),
    ];
    return all.includes(openedKey) ? all : [openedKey];
  }, [records, page, openedKey]);

  if (!friend) return null;

  return (
    <DaysFeed
      onRefresh={() => loadPage(userId)}
      title={`${possessive(friend.name)} days`}
      days={keys}
      openedDay={openedKey}
      renderDay={(key) => {
        const [era, dayText] = key.split(':');
        const day = Number(dayText);
        // No `onPress` — the avatar and name would only open the profile
        // this feed was already opened from.
        if (era === NOW) {
          const record = records.find((r) => r.day === day);
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
        }
        const past = page?.pastRuns.find((r) => r.membershipId === era);
        const record = past?.days.find((d) => d.day === day);
        if (!past || !record) return null;
        return (
          <FriendCard
            friend={pastRunAuthor(friend, past)}
            post={{ id: `${era}-day${day}`, day, tasks: record.tasks, caption: record.caption }}
          />
        );
      }}
    />
  );
}
