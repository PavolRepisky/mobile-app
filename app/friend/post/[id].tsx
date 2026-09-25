import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FriendCard } from '@/components/FriendCard';
import { topPadding } from '@/components/Screen';
import { Text } from '@/components/Text';
import { colors, screenPadding, spacing } from '@/constants/theme';
import { PEOPLE } from '@/data/content';

/** Matches the back chevron's own drawn size — the own-profile "My Days"
 * screen's own footprint for it, since the button floats above the scroll
 * rather than sitting in its flow. */
const BACK_ICON_SIZE = 26.6;

/**
 * A friend's or member's posts, opened from their profile grid — every day
 * they've shot, most recent first, the same continuous feed your own "My
 * Days" screen scrolls through, landing on the tile that was tapped rather
 * than always the top. The back button floats over the feed the same way —
 * scrolling between days never moves it, and the title band above scrolls
 * with the content instead. Each day is the same `FriendCard` the Community
 * feed posts with: photo carousel, like, and the comment thread behind its
 * own sheet.
 */
export default function FriendPostScreen() {
  const { id, day: dayParam } = useLocalSearchParams<{ id: string; day?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const friend = PEOPLE.find((f) => f.id === String(id)) ?? PEOPLE[0];
  const openedDay = Number(dayParam) || friend.day;

  const days = [
    { day: friend.day, tasks: friend.tasks },
    ...(friend.pastPosts ?? []),
  ].sort((a, b) => b.day - a.day);

  const headerTop = topPadding(insets.top);

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
    <View style={styles.root}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => {
          userScrolledRef.current = true;
        }}
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerTop, paddingBottom: insets.bottom + spacing.xl },
        ]}
      >
        {/* The feed's own title, sharing the back chevron's line the way
            every other pushed screen's title band does. */}
        <View style={styles.titleBand}>
          <Text variant="sectionTitle" center>
            {friend.name}&apos;s Days
          </Text>
        </View>

        {days.map(({ day, tasks }) => (
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
              post={day === friend.day ? undefined : { id: `${friend.id}-day${day}`, day, tasks }}
            />
          </View>
        ))}
      </ScrollView>

      {/* Floats over the feed rather than living inside one post, so
          scrolling between days never moves it. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={() => router.back()}
        hitSlop={spacing.md}
        style={({ pressed }) => [
          styles.back,
          { top: headerTop },
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.backIconStack}>
          <Ionicons name="chevron-back" size={26} color={colors.ink} />
          <Ionicons
            name="chevron-back"
            size={26}
            color={colors.ink}
            style={styles.backIconOverlay}
          />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.backgroundPlain,
  },
  // Without an explicit bound here the ScrollView has no viewport of its own
  // to scroll within — it just renders its content at full length and
  // whatever falls past the screen edge is gone, not scrolled to.
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: screenPadding,
  },
  titleBand: {
    minHeight: BACK_ICON_SIZE,
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  // One post's clearance from the next — the own-profile "My Days" feed's
  // own break between days.
  post: {
    marginBottom: spacing['3xl'],
  },
  back: {
    position: 'absolute',
    left: screenPadding,
  },
  backIconStack: {
    width: BACK_ICON_SIZE,
    height: BACK_ICON_SIZE,
  },
  backIconOverlay: {
    position: 'absolute',
    left: 0.6,
    top: 0.6,
  },
  pressed: {
    opacity: 0.7,
  },
});
