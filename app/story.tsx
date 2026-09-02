import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Placeholder } from '@/components/Placeholder';
import { Text } from '@/components/Text';
import { absoluteFill, colors, radii, spacing } from '@/constants/theme';
import { useApp, useDayProgress } from '@/hooks/useAppState';

/** How long a story holds before it moves on. */
const STORY_MS = 5000;

/**
 * Full-bleed story viewer over a day's proof photos. One story per task with a
 * photo on it, in checklist order, counted out by the bars along the top the
 * way Instagram does it: a day with two photos is two stories and two bars,
 * and photographing a third adds one.
 *
 * Each story plays itself out — its bar fills over `STORY_MS` and hands over
 * to the next when it lands. Tapping the right half skips ahead, the left half
 * goes back, and running past the end closes.
 */
export default function StoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, currentDay } = useApp();
  const { day } = useLocalSearchParams<{ day?: string }>();

  // The ring is tapped from whatever day the scrubber is parked on, so the
  // story follows that rather than always showing today.
  const viewing = Number(day) || currentDay;
  const rows = useDayProgress(viewing);
  const [index, setIndex] = useState(0);

  const stories = useMemo(
    () =>
      rows
        // Not gated on the task being ticked: a photo is taken *for* a task,
        // often before it is marked off, and it should show up the moment it
        // is attached rather than when the circle is filled in.
        .filter((row) => row.photo || row.photoSeed)
        .map((row) => ({
          key: row.task.id,
          photo: row.photo ?? null,
          seed: row.photoSeed ?? row.task.id,
          time: row.time ?? null,
        })),
    [rows],
  );

  // Nothing photographed yet: one empty frame rather than a blank screen, so
  // the viewer still opens and closes the way it always does.
  const frames = stories.length
    ? stories
    : [{ key: 'empty', photo: null, seed: 'story-empty', time: null }];
  const current = frames[Math.min(index, frames.length - 1)];

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
    run.start(({ finished }) => {
      if (finished) advance(1);
    });
    return () => run.stop();
    // `advance` is rebuilt every render; the run only has to restart when the
    // story it is timing changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, frames.length, fill]);

  return (
    <View style={styles.root}>
      {current.photo ? (
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
          <Avatar source={profile.avatar ?? profile.avatarSeed} size={34} />
          <Text variant="bodyBold" color={colors.inkInverse} style={styles.name}>
            {profile.name}
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

      {/* Tap zones sit under the chrome so the close button still wins. */}
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
  zone: {
    flex: 1,
  },
});
