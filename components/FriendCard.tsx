import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { absoluteFill, colors, gradients, layout, radii, shadows, tapSlop } from '@/constants/theme';
import { LOVE, type Friend } from '@/data/content';
import { useApp } from '@/hooks/useAppState';
import { useSocial } from '@/hooks/useSocial';
import { postKey } from '@/lib/backend/social';
import { addDays, relativeDay } from '@/lib/format';
import { startOfToday } from '@/lib/round';
import { CommentsSheet, type CommentEntry } from './CommentsSheet';
import { PostHeader } from './PostHeader';
import { LockedOverlay } from './LockedOverlay';
import { MosaicArrangement, type CollageCell } from './PhotoCollage';
import { Placeholder } from './Placeholder';
import { NATIVE_HEADER } from './Screen';
import { Text } from './Text';

/** Square, unlike the post-detail screen's own taller carousel — this is one
 * of many posts stacked in a feed, so it keeps the block the static grid it
 * replaces already had, rather than growing each post to a full-page photo. */
const CAROUSEL_RATIO = 1;

/** Handed to `Image`/`View` as often as to the arrangement itself, so it's
 * kept out of the stylesheet the way the post-detail screen's own copy is. */
const GRID_CELL_PIECE = { flex: 1 } as const;

/**
 * Applied to the photo itself while locked — heavier than the canvas's 18,
 * which left too much of the shot readable on a phone. This is
 * the whole of the lock's blur: `Image`'s `blurRadius` blurs the pixels
 * directly, so it holds on every platform, where a backdrop blur has none on
 * web or older Android. Soft enough that the day's colours still show
 * through under `LockedOverlay`'s light wash, too soft to make out the shot.
 */
export const LOCK_BLUR_RADIUS = 50;

/** Blur on the day stamp's drop shadow — wide and soft, so it lifts the
 * white type off a bright shot without drawing an edge around the letters. */
const STAMP_SHADOW_RADIUS = 12;

export interface FriendCardProps {
  friend: Friend;
  onPress?: () => void;
  /** Blurs the photo behind a lock — the Community feed before the account
   * has proven today with its own photographed task. Everything else on the
   * post (identity, actions, caption) stays plain and tappable. */
  locked?: boolean;
  /** Drawn at the far end of the identity row — the Members feed's Add. */
  accessory?: React.ReactNode;
  /** A post in a days feed: the face goes without its ring, which on one
   * person's own days would only repeat what their profile already showed. */
  daysFeed?: boolean;
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
    /** That day's own caption. */
    caption?: string;
  };
}


/** How close two taps have to land to count as a double tap — the window
 * iOS itself gives a double tap. */
const DOUBLE_TAP_MS = 300;
/**
 * The ❤️ that pops over the photo on a double tap: set in the `burst` type
 * (44, on a line tall enough that the emoji isn't clipped) and drawn twice
 * that, since an emoji only takes its size from its type.
 */
const HEART_SCALE = 2;

/** The heart that pops over the photo on a double tap, before it's scaled
 * up — the size the emoji it replaced drew at. */
const BURST_HEART = 44;
/** The heart and comment row's height, and the glyphs on it — the size a
 * post's actions take in the photo apps it sits beside. */
const ACTION_ROW = 34;
const ACTION_ICON = 24;
/** Each action's tap area reaches Apple's 44pt minimum above and below,
 * without the row itself growing. */
const ACTION_SLOP = { top: tapSlop(ACTION_ROW), bottom: tapSlop(ACTION_ROW) };
/** One carousel page marker riding the photo's bottom edge. */
const CAROUSEL_DOT = 6;

/** Minutes past midnight for a task's "7:40 AM", so times compare. */
const clockMinutes = (time: string) => {
  const match = /^(\d{1,2}):(\d{2})\s*([AP]M)$/i.exec(time.trim());
  if (!match) return -1;
  const hour = (Number(match[1]) % 12) + (match[3].toUpperCase() === 'PM' ? 12 : 0);
  return hour * 60 + Number(match[2]);
};

/** When the day became a post: the latest time on any of its tasks — the
 * checklist's order isn't the order they were done in. */
const finishedAt = (tasks: readonly { time?: string }[]) =>
  tasks.reduce<string | undefined>(
    (latest, task) =>
      task.time && (!latest || clockMinutes(task.time) > clockMinutes(latest))
        ? task.time
        : latest,
    undefined,
  );

/**
 * A day as one flat post, the same wherever it's met — Community, My days, a
 * friend's days — so it only ever changes here. `PostHeader` leads: the face
 * in that day's task ring, name and the time the day was finished, then
 * "Day N · challenge"; then the same edge-to-edge photo mosaic the post-detail screen's
 * own grid slide cuts, just their shot tasks and nothing standing in for the
 * rest, and a like/comment action row. The comments themselves are never on
 * the card — Instagram's own thread lives behind the comment icon, in the
 * sheet that slides up over it, not stacked under the caption.
 *
 * Only the avatar and the name lead to their profile — the photo itself is
 * just the post's own image, not a control.
 */
export function FriendCard({
  friend,
  onPress,
  locked,
  accessory,
  daysFeed,
  style,
  post,
}: FriendCardProps) {
  const router = useRouter();
  const { profile, challenge } = useApp();
  const social = useSocial();
  const [draft, setDraft] = useState('');
  const [commentsOpen, setCommentsOpen] = useState(false);

  const day = post?.day ?? friend.day;
  const postTasks = post?.tasks ?? friend.tasks;
  // When the day was: which day — counted back from the poster's own today,
  // since `friend.day` is the day they're on — and the time it was finished,
  // once it was, a space apart: "Yesterday 9:12 PM", "Oct 6 8:05 AM".
  const finishedTime = finishedAt(postTasks);
  const time = [relativeDay(addDays(startOfToday(), day - friend.day)), finishedTime]
    .filter(Boolean)
    .join(' ');
  // A post is one membership's day; everything said and felt about it is
  // kept against that pair.
  const membershipId = friend.membershipId;
  const key = membershipId ? postKey(membershipId, day) : null;
  const { ensureStats } = social;
  useEffect(() => {
    if (membershipId) ensureStats([{ membershipId, day }]);
  }, [membershipId, day, ensureStats]);
  const stats = key ? social.stats[key] : undefined;

  // A post takes one reaction, a heart: one per person, tapped again to take
  // it back. Every reaction already on the post counts as one — older ones
  // were left as other emoji, and nobody's number should drop for it.
  const mine = stats?.mine ?? null;
  const hearts = Object.values(stats?.reactions ?? {}).reduce((sum, n) => sum + n, 0);
  const react = (emoji: string) => {
    if (!membershipId) return;
    // The light tap iOS gives a like as it lands.
    if (NATIVE_HEADER) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    social.react(membershipId, day, emoji);
  };

  // The thread loads when the sheet opens, and again after each comment,
  // so what's there is what's on the server.
  const [comments, setComments] = useState<CommentEntry[]>([]);
  useEffect(() => {
    if (!commentsOpen || !membershipId) return;
    let live = true;
    social.thread(membershipId, day).then((thread) => live && setComments(thread)).catch(() => {});
    return () => {
      live = false;
    };
  }, [commentsOpen, membershipId, day, social.thread]);
  // Replies count toward the total at every depth — the pill reports the
  // size of the whole thread, not just its top row.
  const commentCount = stats?.comments ?? 0;

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

  // What they wrote for the day, not a list of what they ticked off — the
  // photos already show that.
  const caption = post ? post.caption : friend.caption;

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

  // Double tap to love: the second tap inside the window leaves a heart —
  // never takes one back, the way Instagram's double tap only ever likes —
  // and pops a big heart over the photo so the tap reads as landed.
  const lastTap = useRef(0);
  // The heart pops up over the photo and fades where it stands — it doesn't
  // fly to the one under the post, which fills at the tap, so the like reads
  // as left the moment it's made.
  const pop = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;
  const onPhotoTap = () => {
    const now = Date.now();
    if (now - lastTap.current > DOUBLE_TAP_MS) {
      lastTap.current = now;
      return;
    }
    lastTap.current = 0;
    if (membershipId) social.love(membershipId, day, LOVE);

    pop.setValue(0);
    heartOpacity.setValue(1);
    Animated.sequence([
      // A stiffer spring: still a bounce, but settled fast enough that the
      // heart doesn't hang on the photo before it goes.
      Animated.spring(pop, { toValue: 1, friction: 6, tension: 160, useNativeDriver: true }),
      Animated.timing(heartOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };
  const [carouselWidth, setCarouselWidth] = useState(0);
  const carouselHeight = carouselWidth ? Math.round(carouselWidth / CAROUSEL_RATIO) : 0;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!carouselWidth) return;
    const next = Math.round(e.nativeEvent.contentOffset.x / carouselWidth);
    if (next !== activeIndex) setActiveIndex(next);
  };

  const renderSlide = (item: (typeof slides)[number]) => {
    const slideSize = { width: carouselWidth, height: carouselHeight };
    if (item.kind === 'grid' && locked) {
      // Locked, the grid isn't cut into cells at all. Each photo blurs only
      // inside its own box, so blurred cell by cell the seams between them
      // stayed sharp lines across the blur. Instead every photo is laid over
      // the whole slide, each a step more see-through than the one under it
      // (1, 1/2, 1/3…, an even running blend), so the day reads as one soft
      // wash of its colours with nothing to trace.
      const shots = item.rows.filter((row) => row.photo);
      return (
        <View style={slideSize}>
          {shots.map((row, i) => (
            <Image
              key={row.key}
              source={row.photo}
              style={[absoluteFill, { opacity: 1 / (i + 1) }]}
              contentFit="cover"
              blurRadius={LOCK_BLUR_RADIUS}
            />
          ))}
        </View>
      );
    }
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
          {/* The day laid across the middle of the grid,
              cover-line style, with the challenge's name
              letterspaced over it the way the reference
              sets "Six pics of" over its month. One line at
              any length: a long day shrinks to fit rather
              than wrapping. Hidden while locked: a big
              number floating over a blur reads as a
              teaser, not a post. */}
          {locked ? null : (
            <DayStamp day={day} kicker={friend.challengeName ?? challenge.name} />
          )}
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
  };

  const submit = (parentId: string | null) => {
    const text = draft.trim();
    if (!text || !membershipId) return;
    setDraft('');
    social
      .comment(membershipId, day, text, parentId)
      .then(setComments)
      // Didn't send: the words come back to the composer to try again.
      .catch(() => setDraft(text));
  };

  return (
    <View style={style}>
      <PostHeader
        avatar={friend.avatar}
        name={friend.name}
        time={time}
        day={day}
        challengeName={friend.challengeName ?? challenge.name}
        done={postTasks.filter((task) => task.done).length}
        total={postTasks.length}
        ring={!daysFeed}
        onPressProfile={onPress}
        onPressChallenge={() =>
          router.push({ pathname: '/feed/[id]', params: { id: friend.challengeId ?? challenge.id } })
        }
        accessory={accessory}
      />

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
            title="Unlocks when you post"
            onPress={() => router.push('/(tabs)/tasks')}
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
                    renderItem={({ item }) => (
                      // A double tap anywhere on the photo leaves a heart;
                      // single taps and swipes still belong to the carousel.
                      <Pressable
                        accessible={false}
                        disabled={locked}
                        onPress={onPhotoTap}
                      >
                        {renderSlide(item)}
                      </Pressable>
                    )}
                  />

                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.heartBurst,
                      {
                        opacity: heartOpacity,
                        transform: [
                          {
                            scale: pop.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.3 * HEART_SCALE, HEART_SCALE],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <Ionicons name="heart" size={BURST_HEART} color={colors.liked} />
                  </Animated.View>

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

      {/* The heart, then the comments beside it — bare glyphs with their
          counts, no pill round them. The heart fills red once you've left
          yours; a tap leaves it, another takes it back. */}
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Like, ${hearts}`}
          accessibilityState={{ selected: mine !== null }}
          onPress={() => react(mine ?? LOVE)}
          hitSlop={ACTION_SLOP}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <Ionicons
            name={mine !== null ? 'heart' : 'heart-outline'}
            size={ACTION_ICON}
            color={mine !== null ? colors.liked : colors.ink}
          />
          {/* Nobody yet is no number at all, not a "0". */}
          {hearts > 0 ? <Text variant="metaBold">{hearts}</Text> : null}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Comments, ${commentCount}`}
          onPress={() => setCommentsOpen(true)}
          hitSlop={ACTION_SLOP}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <Ionicons name="chatbubble-outline" size={ACTION_ICON} color={colors.ink} />
          {commentCount > 0 ? <Text variant="metaBold">{commentCount}</Text> : null}
        </Pressable>
      </View>

      {caption ? (
        // Plain reading text at `copy`'s size, set in Medium — the weight the
        // app's running prose sits on — so the handle leading it at
        // `copyBold` stands clear two steps up, the way a caption opens on
        // its author.
        <Text variant="body" style={styles.caption}>
          <Text variant="copyBold">
            {friend.handle}{' '}
          </Text>
          {caption}
        </Text>
      ) : null}

      {/* The way into the thread in words, under the caption — the pill
          above says how many, this says there's more to read. */}
      {commentCount > 0 ? (
        <Text
          variant="meta"
          color={colors.inkMuted}
          accessibilityRole="button"
          onPress={() => setCommentsOpen(true)}
          style={styles.viewComments}
        >
          {commentCount === 1 ? 'View 1 comment' : `View all ${commentCount} comments`}
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

export interface DayStampProps {
  day: number;
  /** Letterspaced over the numeral — the challenge's name. */
  kicker?: string;
  /**
   * The width of the post this stamp was set for. Given one, the stamp lays
   * itself out at that width and scales the whole thing — band, kicker and
   * numeral together — down into its own box, so a profile grid tile carries
   * a true miniature of the opened post's stamp rather than a numeral shrunk
   * on its own inside a band sized for the tile.
   */
  referenceWidth?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * "Day N" stamped across a post's photo grid, over a band of shade — shared
 * by the post itself and the profile grid's tile for it, so a day wears the
 * same stamp before it's opened as after. One line at any length: a long day
 * shrinks to fit rather than wrapping.
 */
export function DayStamp({ day, kicker, referenceWidth, style }: DayStampProps) {
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);

  const content = (
    <>
      <LinearGradient colors={gradients.stampBand} style={styles.dayStampBand} />
      {kicker ? (
        <Text
          variant="stamp"
          color={colors.surface}
          numberOfLines={1}
          style={[styles.dayStampShadow, styles.dayStampKicker]}
        >
          {kicker}
        </Text>
      ) : null}
      <Text
        variant="poster"
        color={colors.surface}
        numberOfLines={1}
        adjustsFontSizeToFit
        style={styles.dayStampShadow}
      >
        Day {day}
      </Text>
    </>
  );

  if (!referenceWidth) {
    return (
      <View style={[styles.dayStamp, style]} pointerEvents="none">
        {content}
      </View>
    );
  }

  // Laid out at the post's own width, centred on the box, then scaled about
  // that centre — which lands it exactly edge to edge.
  const scale = box ? box.width / referenceWidth : 0;
  const inner = box && scale ? { width: referenceWidth, height: box.height / scale } : null;
  return (
    <View
      style={[styles.dayStampFrame, style]}
      pointerEvents="none"
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setBox({ width, height });
      }}
    >
      {box && inner ? (
        <View
          style={[
            styles.dayStamp,
            inner,
            {
              left: (box.width - inner.width) / 2,
              top: (box.height - inner.height) / 2,
              transform: [{ scale }],
            },
          ]}
        >
          {content}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // The gap before the photo and the full-bleed width both live here, kept
  // outside `LockedOverlay`: bled *inside* it, the overlay's own
  // `overflow: hidden` would clip the bleed straight back to this view's
  // unbled width the moment it locks, and the top gap would read as blurred
  // blank space reaching up to the subtitle instead of clear air above it.
  photoOuter: {
    zIndex: 1,
    marginTop: layout.heading,
    marginHorizontal: -layout.gutter,
  },
  dayStamp: {
    ...absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: layout.gutter,
  },
  // The scaled stamp's own box — clipped, so the full-size layout sitting
  // behind the scale never spills past a tile before it has shrunk.
  dayStampFrame: {
    ...absoluteFill,
    overflow: 'hidden',
  },
  dayStampBand: {
    ...absoluteFill,
  },
  dayStampShadow: {
    textShadowColor: colors.onMediaShadow,
    textShadowRadius: STAMP_SHADOW_RADIUS,
  },
  // Clear of the numeral's caps by a hair — the kicker's descenders sat on
  // the digits any closer.
  dayStampKicker: {
    marginBottom: layout.line,
  },
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: layout.heading,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: layout.line,
  },
  dot: {
    width: CAROUSEL_DOT,
    height: CAROUSEL_DOT,
    borderRadius: radii.pill,
    backgroundColor: colors.onMediaTrack,
  },
  dotActive: {
    backgroundColor: colors.surface,
  },
  // The heart and the comments side by side at the start, on the page's
  // margin like the caption under them.
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.block,
    marginTop: layout.heading,
  },
  action: {
    height: ACTION_ROW,
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.line,
  },
  caption: {
    marginTop: layout.stack,
  },
  viewComments: {
    marginTop: layout.line,
  },
  // Centred over the photo, never in the way of a touch.
  // The liked heart's red, lifted off any photo by the soft shadow.
  heartBurst: {
    ...absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  },
  pressed: {
    opacity: 0.7,
  },
});

export default FriendCard;
