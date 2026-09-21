import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radii, screenPadding, spacing } from '@/constants/theme';
import { type Friend } from '@/data/content';
import { useApp } from '@/hooks/useAppState';
import { countComments, mergeCommentThread } from '@/lib/comments';
import { Avatar } from './Avatar';
import { CommentsSheet } from './CommentsSheet';
import { LockedOverlay } from './LockedOverlay';
import { MosaicArrangement, type CollageCell } from './PhotoCollage';
import { Placeholder } from './Placeholder';
import { Text } from './Text';

/** Square, unlike the post-detail screen's own taller carousel — this is one
 * of many posts stacked in a feed, so it keeps the block the static grid it
 * replaces already had, rather than growing each post to a full-page photo. */
const CAROUSEL_RATIO = 1;

/** Handed to `Image`/`View` as often as to the arrangement itself, so it's
 * kept out of the stylesheet the way the post-detail screen's own copy is. */
const GRID_CELL_PIECE = { flex: 1 } as const;

/**
 * Applied to the photo itself while locked — `LockedOverlay`'s own wash and
 * `BlurView` sit on top of the whole block, but `BlurView` has no real
 * backdrop blur on web and on Android short of the experimental method.
 * `Image`'s own `blurRadius` blurs the pixels directly, so the shot reads
 * as genuinely soft-focus everywhere, not just wherever the platform's
 * compositor happens to support a blurred backdrop.
 */
const LOCK_BLUR_RADIUS = 60;

export interface FriendCardProps {
  friend: Friend;
  onPress?: () => void;
  /** Blurs the photo behind a lock — the Community feed before the account
   * has proven today with its own photographed task. Everything else on the
   * post (identity, actions, caption) stays plain and tappable. */
  locked?: boolean;
  style?: StyleProp<ViewStyle>;
  /**
   * Renders one of the friend's earlier days instead of their current one —
   * the profile's own post view reaches an exact day this way. `id` keys the
   * like and the comment thread apart from the Community feed's own card for
   * their current day, which always reads off `friend.id` and is left alone
   * when this is unset. An earlier day has no seeded thread of its own —
   * only what gets added live shows under it.
   */
  post?: {
    id: string;
    day: number;
    tasks: Friend['tasks'];
  };
}

/** Stable per key rather than random, so a fake count doesn't reshuffle on
 * every render — the same trick the post-detail screen's own copy uses. */
function fakeCount(key: string, min: number, max: number): number {
  let h = 0;
  for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) | 0;
  return min + (Math.abs(h) % (max - min + 1));
}

/** The one reaction this card's heart toggles — matches the post-detail
 * screen's own single like, not a picker of the app's full emoji set. */
const LIKE_EMOJI = '❤️';

/**
 * A friend's day as one flat post — avatar, name and the post-detail screen's
 * own subtitle (the challenge, linked, then "Day N" — no relative timestamp)
 * leading, then the same edge-to-edge photo mosaic the post-detail screen's
 * own grid slide cuts, just their shot tasks and nothing standing in for the
 * rest, and a like/comment action row. The comments themselves are never on
 * the card — Instagram's own thread lives behind the comment icon, in the
 * sheet that slides up over it, not stacked under the caption.
 *
 * Only the avatar and the name lead to their profile — the photo itself is
 * just the post's own image, not a control.
 */
export function FriendCard({ friend, onPress, locked, style, post }: FriendCardProps) {
  const router = useRouter();
  const { profile, challenge, postReactions, reactToPost, friendComments, addFriendComment } =
    useApp();
  const [draft, setDraft] = useState('');
  const [commentsOpen, setCommentsOpen] = useState(false);

  const postId = post?.id ?? friend.id;
  const day = post?.day ?? friend.day;
  const postTasks = post?.tasks ?? friend.tasks;

  const liked = (postReactions[postId] ?? null) === LIKE_EMOJI;
  const likeCount = fakeCount(postId, 40, 220) + (liked ? 1 : 0);

  const comments = mergeCommentThread(
    post ? [] : friend.comments ?? [],
    friendComments[postId] ?? [],
    profile.avatar ?? profile.avatarSeed,
  );
  // Replies count toward the total at every depth — the icon reports the
  // size of the whole thread, not just its top row.
  const commentCount = countComments(comments);

  // Only the tasks they've actually shot — a post is the photos themselves,
  // the way the post-detail screen's own grid is, not a checklist with gaps
  // standing in for what's left.
  const cells: CollageCell[] = postTasks
    .filter((task) => task.photo || task.photoSeed)
    .map((task) => ({
      key: task.label,
      photo: task.photo,
      seed: task.photoSeed,
    }));

  const doneLabels = postTasks.filter((task) => task.done).map((task) => task.label);

  // With more than one photo, the carousel opens on the merged grid the
  // static card used to show outright — the post still reads as that tile
  // before it reads as any one photo in it. One photo has no grid that isn't
  // the photo itself, so it opens straight there instead.
  const photoSlides = cells.map((cell) => ({
    key: cell.key,
    kind: 'photo' as const,
    photo: cell.photo ?? null,
    seed: cell.seed ?? cell.key,
  }));
  const slides =
    photoSlides.length > 1
      ? [
          {
            key: 'grid',
            kind: 'grid' as const,
            rows: photoSlides.map((s) => ({ key: s.key, photo: s.photo, seed: s.seed })),
          },
          ...photoSlides,
        ]
      : photoSlides;

  const [activeIndex, setActiveIndex] = useState(0);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const carouselHeight = carouselWidth ? Math.round(carouselWidth / CAROUSEL_RATIO) : 0;

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
    <View style={style}>
      {/* Avatar and name lead to the profile; the subtitle's own challenge
          link leads somewhere else entirely — two separate tap targets, so
          neither is a Pressable nested inside the other. */}
      <View style={styles.identity}>
        <Pressable
          accessibilityRole={onPress ? 'button' : undefined}
          accessibilityLabel={onPress ? `${friend.name}'s profile` : undefined}
          onPress={onPress}
        >
          <Avatar source={friend.avatar} size={32} />
        </Pressable>
        <View style={styles.identityText}>
          <Text
            variant="bodyBold"
            accessibilityRole={onPress ? 'button' : undefined}
            accessibilityLabel={onPress ? `${friend.name}'s profile` : undefined}
            onPress={onPress}
          >
            {friend.name}
          </Text>
          <View style={styles.subtitleRow}>
            <Text
              variant="labelBold"
              color={colors.inkMuted}
              accessibilityRole="button"
              accessibilityLabel={`Open ${challenge.name}`}
              onPress={() =>
                router.push({ pathname: '/feed/[id]', params: { id: challenge.id } })
              }
              style={styles.challengeLink}
            >
              {challenge.name}
            </Text>
            <View style={styles.subtitleDot} />
            <Text variant="labelBold" color={colors.inkMuted}>
              Day {day}
            </Text>
          </View>
        </View>
      </View>

      {slides.length ? (
        // The bleed and the top gap both sit outside the lock, on this
        // wrapper — a bled child clips back to the unbled width the moment
        // an ancestor sets `overflow: hidden`, which `LockedOverlay` does
        // while locked, and the gap read as blurred blank space stacked
        // inside it, close enough to touch the subtitle above.
        <View style={styles.photoOuter}>
          <LockedOverlay
            locked={!!locked}
            radius={0}
            title="Take a photo to unlock"
            hint="Finish one task with a photo and the feed opens up."
            onPress={() => router.push('/(tabs)/todo')}
          >
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
                              seam={0}
                              renderCell={(row) =>
                                row.photo ? (
                                  <Image
                                    key={row.key}
                                    source={row.photo}
                                    style={GRID_CELL_PIECE}
                                    contentFit="cover"
                                    blurRadius={locked ? LOCK_BLUR_RADIUS : undefined}
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
                        <Image
                          source={item.photo}
                          style={slideSize}
                          contentFit="cover"
                          blurRadius={locked ? LOCK_BLUR_RADIUS : undefined}
                        />
                      ) : (
                        <Placeholder seed={item.seed} radius={0} style={slideSize} />
                      );
                    }}
                  />

                  {/* Instagram's own multi-photo tell, the post-detail
                      screen's own dots: small marks riding the bottom edge
                      of the image itself, not a row under it. */}
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
          </LockedOverlay>
        </View>
      ) : null}

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

      {doneLabels.length ? (
        <Text variant="body" color={colors.inkSlate} style={styles.caption}>
          <Text variant="bodyBold">{friend.handle} </Text>
          {doneLabels.join(' · ')}
        </Text>
      ) : null}

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
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
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
  // A drawn dot rather than a "·" glyph — the post-detail screen's own
  // separator, so its size and either gap is its own to set, not whatever a
  // character happens to render at.
  subtitleDot: {
    width: 3,
    height: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.inkMuted,
  },
  // The gap before the photo and the full-bleed width both live here, kept
  // outside `LockedOverlay`: bled *inside* it, the overlay's own
  // `overflow: hidden` would clip the bleed straight back to this view's
  // unbled width the moment it locks, and the top gap would read as blurred
  // blank space reaching up to the subtitle instead of clear air above it.
  photoOuter: {
    marginTop: spacing.md,
    marginHorizontal: -screenPadding,
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  caption: {
    marginTop: spacing.sm,
  },
  pressed: {
    opacity: 0.7,
  },
});

export default FriendCard;
