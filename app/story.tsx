import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { DayStamp, LOCK_BLUR_RADIUS } from '@/components/FriendCard';
import { MosaicArrangement } from '@/components/PhotoCollage';
import { Pill } from '@/components/Pill';
import { Placeholder } from '@/components/Placeholder';
import { Text } from '@/components/Text';
import { absoluteFill, colors, radii, spacing } from '@/constants/theme';
import { PEOPLE } from '@/data/content';
import { useApp, useDayProgress } from '@/hooks/useAppState';

/** How long a story holds before it moves on. */
const STORY_MS = 5000;
/** How long a press has to last to count as a hold rather than a tap —
 * about where Instagram stops treating it as a skip. */
const HOLD_MS = 200;
/** The queue's name for your own story; everyone else goes by their id. */
const ME = 'me';
const HEAD_AVATAR = 34;
/** The post's own separator dot, so the two headers read alike. */
const HEAD_DOT = 3;

/** Handed to `Image` as often as to a `View`, so it's kept out of the
 * stylesheet the way the post's own grid cell is. */
const SUMMARY_CELL = { flex: 1 } as const;

/**
 * Full-bleed story viewer over a day's proof photos. One story per task with a
 * photo on it, in checklist order, counted out by the bars along the top the
 * way Instagram does it: a day with two photos is two stories and two bars,
 * and photographing a third adds one.
 *
 * Each story plays itself out — its bar fills over `STORY_MS` and hands over
 * to the next when it lands. Tapping the right half skips ahead, the left half
 * goes back, and holding either half pauses it until you let go.
 *
 * Opened from Community's "Still going today" row, it carries that row as
 * `queue`, so running past the end of one person's day plays the next
 * person's, and stepping back off the first story plays the one before —
 * the row watched through the way it reads. Without a queue, or past its
 * last person, running off the end closes.
 *
 * Yours and a friend's are the same viewer — opened with `day` for yours, or
 * `friend` from Community's "Still going today" row — so they look and play
 * alike: the face and name up top, the photos in checklist order.
 *
 * Once every task on the day is done, the day is a post as well as a story,
 * and the story ends on one more frame: the post's own photo grid, "Day N"
 * stamped across it, the way an Instagram story carries the post it came
 * from. Tapping it closes the story and lands on the post in the Community
 * feed — stories only last the day, the post stays there.
 */
export default function StoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, challenge, currentDay, markStoryWatched, hasPhotographedTask } = useApp();
  const params = useLocalSearchParams<{ day?: string; friend?: string; queue?: string }>();

  // Whose story is playing. Held here rather than read off the params, so
  // moving along the queue swaps the story in place instead of stacking a
  // new viewer per person.
  const [owner, setOwner] = useState<string>(params.friend ?? ME);
  const queue = useMemo(() => (params.queue ? params.queue.split(',') : []), [params.queue]);
  const place = queue.indexOf(owner);

  /** Whose story this is — someone else's when it isn't yours. */
  const person = owner === ME ? undefined : PEOPLE.find((p) => p.id === owner);

  // Your ring is tapped from whatever day the scrubber is parked on, so your
  // story follows that rather than always showing today; a friend's is the
  // day they're on now.
  const viewing = person ? person.day : Number(params.day) || currentDay;
  const rows = useDayProgress(viewing);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  /**
   * One story per task with a photo on it, in checklist order — read off your
   * progress or off their day. Not gated on the task being ticked: a photo is
   * taken *for* a task, often before it is marked off, and it should show up
   * the moment it is attached rather than when the circle is filled in.
   */
  const stories = useMemo(
    () =>
      person
        ? person.tasks
            .filter((task) => task.photo || task.photoSeed)
            .map((task) => ({
              key: task.label,
              photo: task.photo ?? null,
              seed: task.photoSeed ?? task.label,
              time: task.time ?? null,
            }))
        : rows
            .filter((row) => row.photo || row.photoSeed)
            .map((row) => ({
              key: row.task.id,
              photo: row.photo ?? null,
              seed: row.photoSeed ?? row.task.id,
              time: row.time ?? null,
            })),
    [person, rows],
  );

  // Community's lock reaches in here: until you've shot a task of your own,
  // someone else's story still plays — you can see who's going and how far —
  // but every photo is blurred under the same wash and pill as a locked post,
  // it doesn't count as watched, and it doesn't end on their post.
  const locked = Boolean(person) && !hasPhotographedTask;

  /** Every task done — the day has become a post, so the story can point at it. */
  const finished = person
    ? person.tasks.length > 0 && person.tasks.every((task) => task.done)
    : rows.length > 0 && rows.every((row) => row.done);

  // A day with nothing on it gets one empty frame rather than a blank screen,
  // so the viewer still opens and closes the way it always does. A finished
  // one ends on its post.
  const frames = stories.length
    ? [
        ...stories.map((story) => ({ ...story, summary: false })),
        ...(finished && !locked
          ? [{ key: 'post', photo: null, seed: '', time: null, summary: true }]
          : []),
      ]
    : [{ key: 'empty', photo: null, seed: 'story-empty', time: null, summary: false }];
  const current = frames[Math.min(index, frames.length - 1)];

  // Each photo counts as watched the moment it's up, the way the ring that
  // opened it reads it back. The empty frame and the post at the end aren't
  // photos in the story, so they don't count.
  const watchKey = person ? person.id : `me-${viewing}`;
  const isPhoto = stories.length > 0 && !current.summary;
  useEffect(() => {
    if (isPhoto && !locked) markStoryWatched(watchKey, current.key);
  }, [isPhoto, locked, watchKey, current.key, markStoryWatched]);

  // Stories only last the day, so the post they link lands in the Community
  // feed, where it stays — back down the stack to the tabs rather than a new
  // screen on top, with the feed opening on the post. Your own story of an
  // earlier day has no place in today's feed, so it opens that day's post.
  const openPost = () => {
    if (!person && viewing !== currentDay) {
      router.replace({ pathname: '/day/[day]', params: { day: String(viewing) } });
      return;
    }
    router.dismissTo({
      pathname: '/(tabs)/community',
      params: { post: person ? person.id : `day-${viewing}` },
    });
  };

  /** Plays someone else's story from its start; false when there's no one. */
  const playOwner = (next: string | undefined) => {
    if (next === undefined) return false;
    setOwner(next);
    setIndex(0);
    return true;
  };

  const advance = (delta: number) => {
    const next = index + delta;
    if (next < 0) {
      if (place > 0) playOwner(queue[place - 1]);
      return;
    }
    if (next >= frames.length) {
      if (!(place >= 0 && playOwner(queue[place + 1]))) router.back();
      return;
    }
    setIndex(next);
  };

  // Drives the bar on the current story, and moves to the next one when it
  // fills. Time already shown is kept in `elapsed` rather than read back off
  // the animated value — with the native driver that value only reaches JS
  // after the fact, so a hold would resume from a stale point. A new story
  // (the next frame, or the next person's) starts it from zero; letting go of
  // a hold picks it up where it stopped, for only the time that's left. The
  // reset sits first so it runs after the old run's cleanup has counted up.
  //
  // Each story gets a value of its own. Shared, the next story's bar mounted
  // still holding where the last one stopped and was only emptied by the
  // effect a frame later — the bar jumped ahead, then snapped back to start.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fill = useMemo(() => new Animated.Value(0), [index, owner]);
  const elapsed = useRef(0);
  useEffect(() => {
    elapsed.current = 0;
  }, [index, owner]);
  useEffect(() => {
    if (paused) return;
    fill.setValue(Math.min(elapsed.current / STORY_MS, 1));
    const startedAt = Date.now();
    const run = Animated.timing(fill, {
      toValue: 1,
      duration: Math.max(STORY_MS - elapsed.current, 0),
      easing: Easing.linear,
      useNativeDriver: true,
    });
    // `finished` is false when the cleanup below stops it — a tap moving on
    // early, a hold, or the screen going away — and only a bar that actually
    // ran out should advance.
    run.start(({ finished: ran }) => {
      if (ran) advance(1);
    });
    return () => {
      run.stop();
      elapsed.current += Date.now() - startedAt;
    };
    // `advance` is rebuilt every render; the run only has to restart when the
    // story it is timing changes or a hold lets go.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, owner, frames.length, paused, fill]);

  // The face and the name lead to the profile, the way they do on a post:
  // a friend's opens in place of the story, yours drops back to your tab.
  const openProfile = () => {
    if (person) router.replace({ pathname: '/friend/[id]', params: { id: person.id } });
    else router.dismissTo('/(tabs)/profile');
  };
  const openChallenge = () =>
    router.replace({ pathname: '/feed/[id]', params: { id: challenge.id } });

  return (
    <View style={styles.root}>
      {current.summary ? (
        // The post's own grid, as it opens in Community — only the tasks
        // that got a photo, cut edge to edge, with the day stamped over it.
        <View style={styles.summary} pointerEvents="box-none">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Day ${viewing} post. Opens the post`}
            onPress={openPost}
            style={({ pressed }) => [styles.summaryGrid, pressed && styles.pressed]}
          >
            <MosaicArrangement
              cells={stories}
              seam={0}
              renderCell={(story) =>
                story.photo ? (
                  <Image
                    key={story.key}
                    source={story.photo}
                    style={SUMMARY_CELL}
                    contentFit="cover"
                  />
                ) : (
                  <Placeholder key={story.key} seed={story.seed} radius={0} style={SUMMARY_CELL} />
                )
              }
            />
            <DayStamp day={viewing} kicker={challenge.name} />
          </Pressable>
          <Pill
            tone="floating"
            icon="albums-outline"
            trailingIcon="chevron-forward"
            label="View post"
            bold
            onPress={openPost}
          />
        </View>
      ) : current.photo ? (
        <Image
          source={current.photo}
          contentFit="cover"
          transition={160}
          style={absoluteFill}
          blurRadius={locked ? LOCK_BLUR_RADIUS : undefined}
        />
      ) : (
        <Placeholder seed={current.seed} radius={0} style={absoluteFill} />
      )}

      {/* A locked post's own wash and pill, just a label here: the taps
          either side still step through the story. */}
      {locked ? (
        <View pointerEvents="none" style={[absoluteFill, styles.lockWash]}>
          <Pill
            tone="floating"
            icon="lock-closed"
            label="Unlocks when you post"
            bold
            style={styles.lockPill}
          />
        </View>
      ) : null}

      <View style={[styles.chrome, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.bars}>
          {frames.map((frame, i) => (
            <View key={frame.key} style={styles.bar}>
              {/* Only the story actually playing is an animated view. Handing
                  a bar the playing `fill` and then swapping it for a plain
                  number leaves the native side still driving that view, so
                  the bar you just skipped past can empty instead of staying
                  full. Different
                  element types either side of this branch mean React mounts a
                  fresh view rather than re-using the bound one. */}
              {i === index ? (
                <Animated.View
                  style={[styles.barFill, { transform: [{ scaleX: fill }] }]}
                />
              ) : (
                <View
                  style={[
                    styles.barFill,
                    i < index ? styles.barSeen : styles.barUnseen,
                  ]}
                />
              )}
            </View>
          ))}
        </View>

        {/* A post's own header, set on the photo: face and name to the
            profile, the challenge under them to its feed — separate tap
            targets, so neither is nested inside the other. */}
        <View style={styles.head}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${person ? person.name : profile.name}'s profile`}
            onPress={openProfile}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Avatar
              source={person ? person.avatar : (profile.avatar ?? profile.avatarSeed)}
              size={HEAD_AVATAR}
            />
          </Pressable>
          <View style={styles.identity}>
            <View style={styles.nameRow}>
              <Text
                variant="bodyBold"
                color={colors.inkInverse}
                accessibilityRole="button"
                onPress={openProfile}
                style={styles.name}
              >
                {person ? person.name : profile.name}
              </Text>
              {current.time ? (
                <Text variant="body" color={colors.onMediaSoft}>
                  {current.time}
                </Text>
              ) : null}
            </View>
            <View style={styles.nameRow}>
              <Text
                variant="meta"
                color={colors.onMediaSoft}
                numberOfLines={1}
                accessibilityRole="button"
                accessibilityLabel={`Open ${challenge.name}`}
                onPress={openChallenge}
                style={[styles.challengeLink, styles.shrink]}
              >
                {challenge.name}
              </Text>
              <View style={styles.headDot} />
              <Text variant="meta" color={colors.onMediaSoft}>
                Day {viewing}
              </Text>
            </View>
          </View>

          <View style={styles.spacer} />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => router.back()}
            hitSlop={12}
          >
            <Ionicons name="close" size={26} color={colors.inkInverse} />
          </Pressable>
        </View>
      </View>

      {/* Tap zones sit under the chrome so the close button still wins, and
          under the post frame's grid for the same reason — the page either
          side of it still steps back and forward. */}
      {/* Either half pauses the moment it's touched. A quick tap lets go
          straight away and steps; a hold turns into a long press, which
          swallows the tap, so letting go only resumes. */}
      <View style={styles.zones} pointerEvents="box-none">
        {([-1, 1] as const).map((delta) => (
          <Pressable
            key={delta}
            accessibilityLabel={delta < 0 ? 'Previous' : 'Next'}
            style={styles.zone}
            delayLongPress={HOLD_MS}
            onPressIn={() => setPaused(true)}
            onPressOut={() => setPaused(false)}
            onLongPress={() => {}}
            onPress={() => advance(delta)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.mediaBackdrop,
  },
  chrome: {
    paddingHorizontal: spacing.lg,
    zIndex: 2,
  },
  bars: {
    flexDirection: 'row',
    gap: 4,
  },
  bar: {
    flex: 1,
    height: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.onMediaTrack,
  },
  /**
   * Squashed to nothing against its own left edge and grown back out, rather
   * than slid across under a clipping parent: scaling needs no measurement, so
   * the fill is there on the first frame instead of waiting on an `onLayout`
   * that has to land before anything at all is drawn, and the track no longer
   * needs `overflow: 'hidden'` — which on Android, over a pill radius on a
   * 3px-tall view, is a reliable way to lose the child entirely. Still a
   * transform, so it runs on the UI thread and keeps going while the JS thread
   * is busy decoding the next photo.
   */
  barFill: {
    ...absoluteFill,
    borderRadius: radii.pill,
    backgroundColor: colors.inkInverse,
    transformOrigin: 'left',
  },
  /** Seen outright, or skipped past part-way: either way the bar reads full. */
  barSeen: {
    transform: [{ scaleX: 1 }],
  },
  barUnseen: {
    transform: [{ scaleX: 0 }],
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  identity: {
    flexShrink: 1,
    marginLeft: spacing.md,
  },
  // The post's subtitle spacing: close enough that name and time, or
  // challenge, dot and day, read as one line.
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + spacing.xs / 2,
  },
  headDot: {
    width: HEAD_DOT,
    height: HEAD_DOT,
    borderRadius: radii.pill,
    backgroundColor: colors.onMediaSoft,
  },
  shrink: {
    flexShrink: 1,
  },
  name: {
    fontSize: 17,
  },
  // Underlined like the challenge under a post's name, so it reads as a
  // link on a photo where there's no other cue.
  challengeLink: {
    textDecorationLine: 'underline',
  },
  lockWash: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.scrimLock,
  },
  // `Pill` shrink-wraps to the start of its row; the lock sits dead centre.
  lockPill: {
    alignSelf: 'center',
  },
  spacer: {
    flex: 1,
  },
  zones: {
    ...absoluteFill,
    flexDirection: 'row',
    zIndex: 1,
  },
  // Above the tap zones, so tapping the grid opens the post rather than
  // skipping the story.
  summary: {
    ...absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing['2xl'],
    zIndex: 2,
  },
  // Square, like the post's own grid in the feed.
  summaryGrid: {
    alignSelf: 'stretch',
    aspectRatio: 1,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.85,
  },
  zone: {
    flex: 1,
  },
});
