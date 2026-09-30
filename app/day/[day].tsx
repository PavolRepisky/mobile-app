import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { FriendCard } from '@/components/FriendCard';
import { ScreenScroll } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { layout } from '@/constants/theme';
import { FRIENDS, type Friend } from '@/data/content';
import { orderBySlot, useApp, usePostedDays } from '@/hooks/useAppState';

/**
 * Your own days, opened the way an Instagram post does rather than a story —
 * landing on the tile that was tapped, but free from there to scroll up or
 * down through the post before or after it, one continuous feed.
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

  const { profile, tasks, progress, captions, currentDay, trophies, livesLeft } = useApp();

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
      trophies,
      livesLeft,
      tasks: [],
    }),
    [profile, currentDay, trophies, livesLeft],
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

  const scrollRef = useRef<ScrollView>(null);
  const itemRefs = useRef(new Map<number, View>());
  // A manual scroll means the reader has taken over — the settle-and-jump
  // below must stop correcting the position out from under them.
  const userScrolledRef = useRef(false);

  useEffect(() => {
    userScrolledRef.current = false;
    if (days[0] === openedDay) return;

    // The tapped day's own position isn't known until its box (and every
    // box above it) has actually laid out — which a single layout event
    // isn't reliably the end of once photos start sizing themselves in. A
    // few animation frames of re-measuring settles on the right offset
    // without waiting on any one event to be the final word.
    let cancelled = false;
    let frame = 0;

    const attempt = () => {
      if (cancelled || userScrolledRef.current) return;
      const target = itemRefs.current.get(openedDay);
      const scroller = scrollRef.current;
      if (target && scroller) {
        target.measureLayout(
          scroller as unknown as React.ComponentRef<typeof View>,
          (_x, y) => {
            if (!cancelled && !userScrolledRef.current) {
              scroller.scrollTo({ y, animated: false });
            }
          },
          () => {},
        );
      }
      frame += 1;
      if (frame < 6) requestAnimationFrame(attempt);
    };

    const raf = requestAnimationFrame(attempt);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [openedDay, days]);

  return (
    // The feed's title in the fixed bar — not "Day N", which belongs to the
    // post below it, but what this whole scroll is.
    <ScreenScroll
      ref={scrollRef}
      onScrollBeginDrag={() => {
        userScrolledRef.current = true;
      }}
      header={<ScreenHeader plainTitle="My days" />}
    >
        {days.map((day) => (
          <View
            key={day}
            ref={(r) => {
              if (r) itemRefs.current.set(day, r);
              else itemRefs.current.delete(day);
            }}
            style={styles.post}
          >
            <FriendCard
              friend={me}
              post={{ id: `day-${day}`, day, tasks: tasksFor(day), caption: captions[day] }}
            />
          </View>
        ))}
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  // One post's clearance from the next: each post is a block of the page.
  post: {
    marginBottom: layout.section,
  },
});
