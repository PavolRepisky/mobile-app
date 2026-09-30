import { useEffect, useRef, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { layout } from '@/constants/theme';
import { ScreenScroll } from './Screen';
import { ScreenHeader } from './ScreenHeader';

export interface DaysFeedProps {
  /** What the whole scroll is — "My days", "Lily's days" — not "Day N",
   * which belongs to the post under it. */
  title: string;
  /** The days in the feed, most recent first — the profile grid's order, so
   * paging down from a tile lands on the tile after it. */
  days: readonly number[];
  /** The tile that was tapped: the feed opens scrolled to it. */
  openedDay: number;
  /** One day's post — the shared `FriendCard`. */
  renderDay: (day: number) => ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * A profile's days opened the way an Instagram post does rather than a
 * story — landing on the tile that was tapped, but free from there to scroll
 * up or down through the post before or after it, one continuous feed. Your
 * own "My days" and anyone else's are both this, so the two can't drift: the
 * way back and the title in the fixed bar, then one post per day.
 */
export function DaysFeed({ title, days, openedDay, renderDay, style }: DaysFeedProps) {
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
    <ScreenScroll
      ref={scrollRef}
      onScrollBeginDrag={() => {
        userScrolledRef.current = true;
      }}
      header={<ScreenHeader plainTitle={title} />}
    >
      <View style={style}>
        {days.map((day) => (
          <View
            key={day}
            ref={(r) => {
              if (r) itemRefs.current.set(day, r);
              else itemRefs.current.delete(day);
            }}
            style={styles.post}
          >
            {renderDay(day)}
          </View>
        ))}
      </View>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  // One post's clearance from the next: each post is a block of the page.
  post: {
    marginBottom: layout.section,
  },
});

export default DaysFeed;
