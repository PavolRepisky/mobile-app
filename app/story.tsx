import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { DayStamp } from '@/components/FriendCard';
import { MosaicArrangement } from '@/components/PhotoCollage';
import { Pill } from '@/components/Pill';
import { Placeholder } from '@/components/Placeholder';
import { Text } from '@/components/Text';
import { absoluteFill, colors, radii, spacing } from '@/constants/theme';
import { PEOPLE } from '@/data/content';
import { useApp, useDayProgress } from '@/hooks/useAppState';

/** How long a story holds before it moves on. */
const STORY_MS = 5000;

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
 * goes back, and running past the end closes.
 *
 * Yours and a friend's are the same viewer — opened with `day` for yours, or
 * `friend` from Community's "Still going today" row — so they look and play
 * alike: the face and name up top, the photos in checklist order.
 *
 * Once every task on the day is done, the day is a post as well as a story,
 * and the story ends on one more frame: the post's own photo grid, "Day N"
 * stamped across it, the way an Instagram story carries the post it came
 * from. Tapping it opens the post — replacing the story rather than stacking
 * on it, so the story's own timer can't run out behind the post and close it.
 */
export default function StoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, challenge, currentDay } = useApp();
  const { day, friend } = useLocalSearchParams<{ day?: string; friend?: string }>();

  /** Whose story this is — someone else's when opened with `friend`. */
  const person = friend ? PEOPLE.find((p) => p.id === friend) : undefined;

  // Your ring is tapped from whatever day the scrubber is parked on, so your
  // story follows that rather than always showing today; a friend's is the
  // day they're on now.
  const viewing = person ? person.day : Number(day) || currentDay;
  const rows = useDayProgress(viewing);
  const [index, setIndex] = useState(0);

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
        ...(finished
          ? [{ key: 'post', photo: null, seed: '', time: null, summary: true }]
          : []),
      ]
    : [{ key: 'empty', photo: null, seed: 'story-empty', time: null, summary: false }];
  const current = frames[Math.min(index, frames.length - 1)];

  const openPost = () =>
    person
      ? router.replace({
          pathname: '/friend/post/[id]',
          params: { id: person.id, day: String(viewing) },
        })
      : router.replace({ pathname: '/day/[day]', params: { day: String(viewing) } });

  const advance = (delta: number) => {
    const next = index + delta;
    if (next < 0) return;
    if (next >= frames.length) {
      router.back();
      return;
    }
    setIndex(next);
  };

  // Drives the bar on the current story, and moves to the next one when it
  // fills. Restarted from zero on every change of story, including the ones a
  // tap causes, so the bar always measures the time this story has been up.
  const fill = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    fill.setValue(0);
    const run = Animated.timing(fill, {
      toValue: 1,
      duration: STORY_MS,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    // `finished` is false when the cleanup below stops it — a tap moving on
    // early, or the screen going away — and only a bar that actually ran out
    // should advance.
    run.start(({ finished: ran }) => {
      if (ran) advance(1);
    });
    return () => run.stop();
    // `advance` is rebuilt every render; the run only has to restart when the
    // story it is timing changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, frames.length, fill]);

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
        />
      ) : (
        <Placeholder seed={current.seed} radius={0} style={absoluteFill} />
      )}

      <View style={[styles.chrome, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.bars}>
          {frames.map((frame, i) => (
            <View key={frame.key} style={styles.bar}>
              {/* Only the story actually playing is an animated view. Handing
                  a bar the shared `fill` and then swapping it for a plain
                  number leaves the native side still driving that view, so
                  the `setValue(0)` that starts the next story empties the bar
                  you just skipped past instead of leaving it full. Different
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

        <View style={styles.head}>
          <Avatar
            source={person ? person.avatar : (profile.avatar ?? profile.avatarSeed)}
            size={34}
          />
          <Text variant="bodyBold" color={colors.inkInverse} style={styles.name}>
            {person ? person.name : profile.name}
          </Text>
          <Text variant="body" color={colors.onMediaSoft}>
            {'  ·  '}
            {current.time ?? `Day ${viewing}`}
          </Text>

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
      <View style={styles.zones} pointerEvents="box-none">
        <Pressable
          accessibilityLabel="Previous"
          style={styles.zone}
          onPress={() => advance(-1)}
        />
        <Pressable
          accessibilityLabel="Next"
          style={styles.zone}
          onPress={() => advance(1)}
        />
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
  name: {
    marginLeft: spacing.md,
    fontSize: 17,
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
