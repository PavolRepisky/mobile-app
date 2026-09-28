import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { FriendCard } from '@/components/FriendCard';
import { ScreenScroll } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { spacing } from '@/constants/theme';
import { PEOPLE } from '@/data/content';

/**
 * A friend's or member's posts, opened from their profile grid — every day
 * they've shot, most recent first, the same continuous feed your own "My
 * days" screen scrolls through, landing on the tile that was tapped rather
 * than always the top. The way back and the title sit in the fixed bar, so
 * scrolling between days never moves them. Each day is the same `FriendCard`
 * the Community feed posts with: photo carousel, like, and the comment thread
 * behind its own sheet.
 */
export default function FriendPostScreen() {
  const { id, day: dayParam } = useLocalSearchParams<{ id: string; day?: string }>();

  const friend = PEOPLE.find((f) => f.id === String(id)) ?? PEOPLE[0];
  const openedDay = Number(dayParam) || friend.day;

  const days = [
    { day: friend.day, tasks: friend.tasks },
    ...(friend.pastPosts ?? []),
  ].sort((a, b) => b.day - a.day);

  const scrollRef = useRef<ScrollView>(null);
  const itemRefs = useRef(new Map<number, View>());
  // A manual scroll means the reader has taken over — the settle-and-jump
  // below must stop correcting the position out from under them.
  const userScrolledRef = useRef(false);

  useEffect(() => {
    userScrolledRef.current = false;
    if (days[0]?.day === openedDay) return;

    // The tapped day's own position isn't known until its box (and every box
    // above it) has actually laid out — which a single layout event isn't
    // reliably the end of once photos start sizing themselves in. A few
    // animation frames of re-measuring settles on the right offset without
    // waiting on any one event to be the final word.
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
    <ScreenScroll
      ref={scrollRef}
      onScrollBeginDrag={() => {
        userScrolledRef.current = true;
      }}
      header={<ScreenHeader bar plainTitle={`${friend.name}'s days`} />}
    >
        {days.map(({ day, tasks, caption }) => (
          <View
            key={day}
            ref={(r) => {
              if (r) itemRefs.current.set(day, r);
              else itemRefs.current.delete(day);
            }}
            style={styles.post}
          >
            {/* No `onPress` here — the avatar and name would only open the
                profile this feed was already opened from. */}
            <FriendCard
              friend={friend}
              post={
                day === friend.day
                  ? undefined
                  : { id: `${friend.id}-day${day}`, day, tasks, caption }
              }
            />
          </View>
        ))}
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  // One post's clearance from the next — the own-profile "My days" feed's
  // own break between days.
  post: {
    marginBottom: spacing['3xl'],
  },
});
