import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FriendCard } from '@/components/FriendCard';
import { topPadding } from '@/components/Screen';
import { Text } from '@/components/Text';
import { colors, screenPadding, spacing } from '@/constants/theme';
import { FRIENDS, type Friend } from '@/data/content';
import { useApp, usePostedDays } from '@/hooks/useAppState';

/** Matches the back chevron's own drawn size — used to reserve exactly its
 * footprint at the top of the feed, since the button itself floats above the
 * scroll rather than sitting in its flow. */
const BACK_ICON_SIZE = 26.6;

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
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const postedDays = usePostedDays();
  // A day reached by a link rather than a tap on the grid — nothing
  // photographed yet, say — has no neighbours in the feed to scroll onto, so
  // it shows just itself.
  const days = postedDays.includes(openedDay) ? postedDays : [openedDay];

  const headerTop = topPadding(insets.top);

  const { profile, tasks, progress, currentDay, trophies, livesLeft } = useApp();

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
    tasks.map((task) => {
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
            every other pushed screen's title band does — not "Day N", which
            belongs to the post below it, but what this whole scroll is. */}
        <View style={styles.titleBand}>
          <Text variant="sectionTitle" center>
            My Days
          </Text>
        </View>

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
              post={{ id: `day-${day}`, day, tasks: tasksFor(day) }}
            />
          </View>
        ))}
      </ScrollView>

      {/* Floats over the feed rather than living inside one post, so
          scrolling between days never moves it — the title band above
          scrolls with the content, exactly the way the Community tab's own
          header does. */}
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
  // Without an explicit bound here the ScrollView has no viewport of its
  // own to scroll within — it just renders its content at full length and
  // whatever falls past the screen edge is gone, not scrolled to.
  scroll: {
    flex: 1,
  },
  // The gutter `FriendCard` bleeds its photos back out of, edge to edge —
  // the same one the Community tab's own feed sits in.
  content: {
    flexGrow: 1,
    paddingHorizontal: screenPadding,
  },
  // Shares the back chevron's own line — same trick a pushed screen's title
  // band always uses to line a centred title up with the button beside it.
  titleBand: {
    minHeight: BACK_ICON_SIZE,
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  // One post's clearance from the next — a feed post's own quiet break, the
  // same role the Community list's own `gap` plays between `FriendCard`s.
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
