import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type TextInput as RNTextInput,
} from 'react-native';

import { Avatar } from '@/components/Avatar';
import { MosaicArrangement } from '@/components/PhotoCollage';
import { Placeholder } from '@/components/Placeholder';
import { ScreenScroll } from '@/components/Screen';
import { Text } from '@/components/Text';
import { bodyTracking, colors, fonts, radii, screenPadding, spacing } from '@/constants/theme';
import { useApp, useDayProgress } from '@/hooks/useAppState';

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

/** Stable per key rather than random, so the like count doesn't reshuffle
 * on every render — the same trick the profile grid's own fake counts use. */
function fakeCount(key: string, min: number, max: number): number {
  let h = 0;
  for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) | 0;
  return min + (Math.abs(h) % (max - min + 1));
}

/**
 * A single day of your own challenge, opened the way an Instagram post does
 * rather than a story — a swipeable carousel you page through at your own
 * speed, not a timer that advances for you, with the same identity row,
 * like/comment/share strip, caption and comment thread a real post carries.
 *
 * `postReactions` / `friendComments` are keyed by whatever id a post hangs
 * its reaction or comment on — a friend's day used their id, this reuses the
 * same map under `day-N` rather than standing up a second, identical bucket
 * of state just for the app's own posts.
 */
export default function DayPostScreen() {
  const { day: dayParam } = useLocalSearchParams<{ day: string }>();
  const day = Number(dayParam) || 1;
  const router = useRouter();

  const { profile, challenge, postReactions, reactToPost, friendComments, addFriendComment } =
    useApp();
  const rows = useDayProgress(day);
  const commentInput = useRef<RNTextInput>(null);

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
  const comments = friendComments[postId] ?? [];
  const likeCount = fakeCount(postId, 40, 220) + (liked ? 1 : 0);

  const [activeIndex, setActiveIndex] = useState(0);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const carouselHeight = carouselWidth ? Math.round(carouselWidth / CAROUSEL_RATIO) : 0;
  const [draft, setDraft] = useState('');

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!carouselWidth) return;
    const next = Math.round(e.nativeEvent.contentOffset.x / carouselWidth);
    if (next !== activeIndex) setActiveIndex(next);
  };

  const submit = () => {
    if (!draft.trim()) return;
    addFriendComment(postId, draft.trim());
    setDraft('');
  };

  return (
    <ScreenScroll tone="plain" padded={false}>
      {/* A bare chevron rather than a titled header band — the post below
          carries its own identity row, the way a feed post does; a page
          title over it would just repeat "Day N" a second time. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={() => router.back()}
        hitSlop={spacing.md}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}
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
              accessibilityLabel="Comment"
              onPress={() => commentInput.current?.focus()}
              hitSlop={spacing.sm}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Ionicons name="chatbubble-outline" size={24} color={colors.ink} />
            </Pressable>
            <Text variant="bodyBold">{comments.length}</Text>
          </View>
        </View>

        {photoSlides.length ? (
          <Text variant="body" color={colors.inkSlate} style={styles.caption}>
            <Text variant="bodyBold">{profile.handle} </Text>
            {photoSlides.map((s) => s.label).join(' · ')}
          </Text>
        ) : null}

        {comments.length > 0 ? (
          <Pressable accessibilityRole="button" style={styles.viewComments}>
            <Text variant="bodyBold" color={colors.inkMuted}>
              View all {comments.length} comment{comments.length > 1 ? 's' : ''}
            </Text>
          </Pressable>
        ) : null}

        {comments.map((comment, i) => (
          <Text key={i} variant="body" color={colors.inkSlate} style={styles.comment}>
            <Text variant="bodyBold">You </Text>
            {comment}
          </Text>
        ))}

        <View style={styles.commentField}>
          <Avatar source={profile.avatar ?? profile.avatarSeed} size={24} />
          <TextInput
            ref={commentInput}
            value={draft}
            onChangeText={setDraft}
            placeholder="Add a comment..."
            placeholderTextColor={colors.inkMuted}
            returnKeyType="send"
            onSubmitEditing={submit}
            style={styles.commentInput}
          />
          {draft.trim() ? (
            <Pressable accessibilityRole="button" onPress={submit} hitSlop={spacing.sm}>
              <Text variant="bodyBold" color={colors.inkSlate}>
                Post
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  back: {
    marginLeft: screenPadding,
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
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
  viewComments: {
    marginTop: spacing.sm,
  },
  comment: {
    marginTop: spacing.xs,
  },
  commentField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 48,
    marginTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  commentInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    letterSpacing: bodyTracking,
    color: colors.ink,
    padding: 0,
  },
});
