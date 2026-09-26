import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FriendCard } from '@/components/FriendCard';
import { IconButton } from '@/components/IconButton';
import {
  profileActionButton,
  profileActionIcon,
  profileActionTop,
} from '@/components/ProfileLayout';
import { topPadding } from '@/components/Screen';
import { Text } from '@/components/Text';
import { colors, layout } from '@/constants/theme';
import { FRIENDS, type Friend } from '@/data/content';
import { useApp, usePostedDays } from '@/hooks/useAppState';

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

  // The line the title and the back button share — My Profile's and
  // Settings' own: the corner button's fixed offset, or the status bar's if
  // that runs lower.
  const headerTop = Math.max(profileActionTop, topPadding(insets.top));

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
          { paddingTop: headerTop, paddingBottom: insets.bottom + layout.section },
        ]}
      >
        {/* The feed's own title, sharing the back chevron's line the way
            every other pushed screen's title band does — not "Day N", which
            belongs to the post below it, but what this whole scroll is. */}
        <View style={styles.titleBand}>
          <Text variant="pageTitle" center>
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

      {/* My Profile's round corner button, as Settings has it — pinned over
          the feed on the title's line, so scrolling between days never moves
          it while the title band above scrolls with the content. */}
      <IconButton
        name="chevron-back"
        size={profileActionButton}
        iconSize={profileActionIcon}
        background={colors.surface}
        onPress={() => router.back()}
        accessibilityLabel="Go back"
        style={[styles.back, { top: headerTop }]}
      />
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
    paddingHorizontal: layout.gutter,
  },
  // The pinned button's height, so the centred title shares its line — the
  // same title band My Profile and Settings open with.
  titleBand: {
    minHeight: profileActionButton,
    justifyContent: 'center',
    marginBottom: layout.title,
  },
  // One post's clearance from the next: each post is a block of the page.
  post: {
    marginBottom: layout.section,
  },
  back: {
    position: 'absolute',
    left: layout.gutter,
  },
});
