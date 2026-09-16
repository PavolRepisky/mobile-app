import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { CommentsSheet } from '@/components/CommentsSheet';
import { MosaicArrangement } from '@/components/PhotoCollage';
import { Placeholder } from '@/components/Placeholder';
import { topPadding } from '@/components/Screen';
import { Text } from '@/components/Text';
import { colors, radii, screenPadding, spacing } from '@/constants/theme';
import { useApp, useDayProgress, usePostedDays } from '@/hooks/useAppState';
import { countComments, mergeCommentThread } from '@/lib/comments';

/** Kept out of the stylesheet for the same reason the profile grid's own
 * copy is — handed to `Image` as often as to a `View`. */
const GRID_CELL_PIECE = { flex: 1 } as const;
const GRID_CELL_SEAM = 0;

/** Width over height for the carousel — Instagram's own tall-photo ratio.
 * Applied as an explicit pixel height rather than `aspectRatio` once the
 * width is known: a horizontal `FlatList` nested in a vertically-scrolling
 * screen has nothing to resolve a flex- or aspect-ratio-based height
 * against, so it collapses to zero without one. */
const CAROUSEL_RATIO = 0.8;

/** The one reaction this screen's heart toggles — the app's reaction bar
 * has a full emoji set elsewhere (a friend's day, the feed), but a post's
 * own like button is just the one glyph, on or off. */
const LIKE_EMOJI = '❤️';

/** Matches the back chevron's own drawn size — used to reserve exactly its
 * footprint at the top of the feed, since the button itself floats above the
 * scroll rather than sitting in its flow. */
const BACK_ICON_SIZE = 26.6;

/** Stable per key rather than random, so the like count doesn't reshuffle
 * on every render — the same trick the profile grid's own fake counts use. */
function fakeCount(key: string, min: number, max: number): number {
  let h = 0;
  for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) | 0;
  return min + (Math.abs(h) % (max - min + 1));
}

/**
 * Your own days, opened the way an Instagram post does rather than a story —
 * landing on the tile that was tapped, but free from there to scroll up or
 * down through the post before or after it, one continuous feed the same
 * way the Community tab scrolls through its own. Each post carries a
 * swipeable photo carousel of its own and the same identity row and
 * like/comment strip a real post carries. The comment thread itself lives in
 * the same `CommentsSheet` a friend's own post opens, behind the comment
 * icon rather than stacked under the caption.
 *
 * `postReactions` / `friendComments` are keyed by whatever id a post hangs
 * its reaction or comment on — a friend's day used their id, this reuses the
 * same map under `day-N` rather than standing up a second, identical bucket
 * of state just for the app's own posts.
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
            My Posts
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
            <DayPost day={day} />
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

/**
 * One day — the original single-day post viewer's own content, unchanged,
 * just one entry in a continuous feed of them rather than the whole screen
 * on its own.
 */
function DayPost({ day }: { day: number }) {
  const router = useRouter();
  const { profile, challenge, postReactions, reactToPost, friendComments, addFriendComment } =
    useApp();
  const rows = useDayProgress(day);

  // The photos that actually exist for the day, each its own full-bleed
  // slide — same set the profile tile's own mosaic is cut from.
  const photoSlides = useMemo(
    () =>
      rows
        .filter((row) => row.photo || row.photoSeed)
        .map((row) => ({
          key: row.task.id,
          kind: 'photo' as const,
          label: row.task.label,
          photo: row.photo ?? null,
          seed: row.photoSeed ?? row.task.id,
        })),
    [rows],
  );

  // With more than one photo, the carousel opens on the same merged mosaic
  // the profile grid tile showed before it was tapped — the post it lands on
  // should read as the tile it came from, not jump straight past it into an
  // arbitrary single photo. A day with just one photo has no mosaic to show
  // that isn't the photo itself, so it opens straight on that slide instead.
  const slides = useMemo(
    () =>
      photoSlides.length > 1
        ? [
            {
              key: 'grid',
              kind: 'grid' as const,
              rows: photoSlides.map((s) => ({ key: s.key, photo: s.photo, seed: s.seed })),
            },
            ...photoSlides,
          ]
        : photoSlides,
    [photoSlides],
  );

  const postId = `day-${day}`;
  const liked = (postReactions[postId] ?? null) === LIKE_EMOJI;
  // No seeded thread of its own — this is the account's own day, so
  // whatever's said on it is only ever the account's own replies.
  const comments = mergeCommentThread([], friendComments[postId] ?? [], profile.avatar ?? profile.avatarSeed);
  const commentCount = countComments(comments);
  const likeCount = fakeCount(postId, 40, 220) + (liked ? 1 : 0);

  const [activeIndex, setActiveIndex] = useState(0);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const carouselHeight = carouselWidth ? Math.round(carouselWidth / CAROUSEL_RATIO) : 0;
  const [draft, setDraft] = useState('');
  const [commentsOpen, setCommentsOpen] = useState(false);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!carouselWidth) return;
    const next = Math.round(e.nativeEvent.contentOffset.x / carouselWidth);
    if (next !== activeIndex) setActiveIndex(next);
  };

  const submit = (parentId: string | null) => {
    if (!draft.trim()) return;
    addFriendComment(postId, draft.trim(), parentId);
    setDraft('');
  };

  return (
    <View>
      {/* The post's own header — avatar, name, the day it went up — sits on
          the post itself rather than in the screen's chrome. */}
      <View style={styles.identity}>
        <Avatar source={profile.avatar ?? profile.avatarSeed} size={32} />
        <View style={styles.identityText}>
          <Text variant="bodyBold">{profile.name}</Text>
          <View style={styles.subtitleRow}>
            <Text
              variant="labelBold"
              color={colors.inkMuted}
              accessibilityRole="button"
              accessibilityLabel={`Open ${challenge.name}`}
              onPress={() =>
                router.push({ pathname: '/feed/[id]', params: { id: challenge.id } })
              }
              // The same underline `TextLink` marks any tappable run of text
              // with elsewhere in the app — nothing else here reads as a link
              // on its own the way a button shape or an icon would.
              style={styles.challengeLink}
            >
              {challenge.name}
            </Text>
            {/* A drawn dot rather than a "·" glyph — the same separator the
                discover list's own icon rows use — so its size and the gap
                either side of it are its own to set, not whatever a
                character happens to render at. */}
            <View style={styles.subtitleDot} />
            <Text variant="labelBold" color={colors.inkMuted}>
              Day {day}
            </Text>
          </View>
        </View>
      </View>

      {slides.length ? (
        <View
          style={carouselHeight ? { height: carouselHeight } : null}
          onLayout={(e) => setCarouselWidth(e.nativeEvent.layout.width)}
        >
          {carouselHeight > 0 ? (
            <>
              <FlatList
                style={{ height: carouselHeight }}
                data={slides}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(s) => s.key}
                onScroll={onScroll}
                scrollEventThrottle={16}
                getItemLayout={(_, index) => ({
                  length: carouselWidth,
                  offset: carouselWidth * index,
                  index,
                })}
                renderItem={({ item }) => {
                  const slideSize = { width: carouselWidth, height: carouselHeight };
                  if (item.kind === 'grid') {
                    return (
                      <View style={slideSize}>
                        <MosaicArrangement
                          cells={item.rows}
                          seam={GRID_CELL_SEAM}
                          renderCell={(row) =>
                            row.photo ? (
                              <Image
                                key={row.key}
                                source={row.photo}
                                style={GRID_CELL_PIECE}
                                contentFit="cover"
                              />
                            ) : (
                              <Placeholder
                                key={row.key}
                                seed={row.seed ?? undefined}
                                radius={0}
                                style={GRID_CELL_PIECE}
                              />
                            )
                          }
                        />
                      </View>
                    );
                  }
                  return item.photo ? (
                    <Image source={item.photo} style={slideSize} contentFit="cover" />
                  ) : (
                    <Placeholder seed={item.seed} radius={0} style={slideSize} />
                  );
                }}
              />

              {/* Instagram's own multi-photo tell: small dots riding the
                  bottom edge of the image itself, not a row under it. */}
              {slides.length > 1 ? (
                <View style={styles.dots}>
                  {slides.map((slide, i) => (
                    <View
                      key={slide.key}
                      style={[styles.dot, i === activeIndex && styles.dotActive]}
                    />
                  ))}
                </View>
              ) : null}
            </>
          ) : null}
        </View>
      ) : (
        <View style={styles.empty}>
          <Text variant="body" color={colors.inkMuted} center>
            Nothing photographed this day yet.
          </Text>
        </View>
      )}

      <View style={styles.body}>
        {/* Just the two reactions this screen actually needs — a like and a
            way to the comment field — rather than the full share/save row
            a real feed post carries. */}
        <View style={styles.actions}>
          <View style={styles.actionGroup}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={liked ? 'Unlike' : 'Like'}
              accessibilityState={{ selected: liked }}
              onPress={() => reactToPost(postId, LIKE_EMOJI)}
              hitSlop={spacing.sm}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={26}
                color={liked ? colors.destructive : colors.ink}
              />
            </Pressable>
            <Text variant="bodyBold">{likeCount}</Text>
          </View>

          <View style={styles.actionGroup}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View comments"
              onPress={() => setCommentsOpen(true)}
              hitSlop={spacing.sm}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Ionicons name="chatbubble-outline" size={24} color={colors.ink} />
            </Pressable>
            <Text variant="bodyBold">{commentCount}</Text>
          </View>
        </View>

        {photoSlides.length ? (
          <Text variant="body" color={colors.inkSlate} style={styles.caption}>
            <Text variant="bodyBold">{profile.handle} </Text>
            {photoSlides.map((s) => s.label).join(' · ')}
          </Text>
        ) : null}
      </View>

      <CommentsSheet
        visible={commentsOpen}
        onDismiss={() => setCommentsOpen(false)}
        comments={comments}
        draft={draft}
        onChangeDraft={setDraft}
        onSubmit={submit}
        composerAvatar={profile.avatar ?? profile.avatarSeed}
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
  content: {
    flexGrow: 1,
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
    width: 26.6,
    height: 26.6,
  },
  backIconOverlay: {
    position: 'absolute',
    left: 0.6,
    top: 0.6,
  },
  pressed: {
    opacity: 0.7,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: screenPadding,
    marginBottom: spacing.md,
  },
  identityText: {
    marginLeft: spacing.sm,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  challengeLink: {
    textDecorationLine: 'underline',
  },
  // A touch smaller than the discover list's own 4px icon-row dot — a true
  // separator mark here, not something meant to draw the eye on its own.
  subtitleDot: {
    width: 3,
    height: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.inkMuted,
  },
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.onMediaTrack,
  },
  dotActive: {
    backgroundColor: colors.surface,
  },
  empty: {
    aspectRatio: 1,
    marginHorizontal: screenPadding,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  body: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  caption: {
    marginTop: spacing.sm,
  },
});
