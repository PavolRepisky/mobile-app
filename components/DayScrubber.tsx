import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors } from '@/constants/theme';

/** Centre-to-centre spacing of the strokes; also the snap interval. */
const ITEM_WIDTH = 12;
/** Every stroke is drawn to the same box; only opacity separates them. */
const TICK_HEIGHT = 24;
const TICK_WIDTH = 3.5;
/** Room around the strokes so nothing clips while scrolling. */
const TRACK_HEIGHT = TICK_HEIGHT + 12;

export interface DayScrubberProps {
  /** Selected day, 1-indexed. */
  day: number;
  totalDays: number;
  /** Fired as the strokes pass the centre line, not just on release. */
  onChange: (day: number) => void;
  style?: StyleProp<ViewStyle>;
}

const clamp = (n: number, min: number, max: number) =>
  Math.min(Math.max(n, min), max);

/**
 * The row of short vertical strokes under the day ring — one per day of the
 * challenge, and scrollable like an iOS date wheel. Every stroke is the same
 * height and thickness, so the row reads as an even ruler; the one on the
 * centre line is the selected day, full black, with neighbours fading out the
 * further from it they sit, so the bar reads as a focus point rather than a
 * progress fill. Every stroke that crosses the centre fires a selection tick,
 * which is what makes the drag feel detented.
 */
export function DayScrubber({
  day,
  totalDays,
  onChange,
  style,
}: DayScrubberProps) {
  const { width } = useWindowDimensions();
  const scroller = useRef<ScrollView>(null);
  const [active, setActive] = useState(() => clamp(day - 1, 0, totalDays - 1));
  const activeRef = useRef(active);
  activeRef.current = active;
  const positioned = useRef(false);
  const lastTick = useRef(0);

  // Half a screen of padding on each side lets the first and last day reach
  // the centre line.
  const sidePad = Math.max((width - ITEM_WIDTH) / 2, 0);
  const offsetFor = (index: number) => index * ITEM_WIDTH;

  /**
   * Where the scroller starts, fixed at mount. iOS re-applies `contentOffset`
   * every time the prop changes, so deriving it from the selected day turns
   * each scroll event into a fresh seek: mid-animation the offset gets reset
   * to wherever the sweep had got to, which cancels the animation and starts
   * another one, and the loop walks the scroller down to day one. Held in a
   * ref, the prop never changes identity and iOS leaves the scroller alone.
   * Everything after mount moves through `scrollTo`.
   */
  const initialOffset = useRef({
    x: offsetFor(clamp(day - 1, 0, totalDays - 1)),
    y: 0,
  }).current;

  // A day changed from somewhere other than this scroller (a restart, the day
  // rolling over): follow it rather than fighting it.
  useEffect(() => {
    const next = clamp(day - 1, 0, totalDays - 1);
    if (next === activeRef.current) return;
    setActive(next);
    scroller.current?.scrollTo({ x: offsetFor(next), animated: true });
  }, [day, totalDays]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = clamp(
      Math.round(e.nativeEvent.contentOffset.x / ITEM_WIDTH),
      0,
      totalDays - 1,
    );
    if (index === activeRef.current) return;

    activeRef.current = index;
    setActive(index);
    // A hard flick crosses days faster than the taptic engine can play them;
    // past a few per frame the feedback stops reading as detents and starts
    // lagging behind the scroll, so the ripple is thinned rather than queued.
    const now = Date.now();
    if (Platform.OS !== 'web' && now - lastTick.current >= 25) {
      lastTick.current = now;
      Haptics.selectionAsync().catch(() => {});
    }
    onChange(index + 1);
  };

  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel={`Day ${day} of ${totalDays}`}
      accessibilityValue={{ min: 1, max: totalDays, now: day }}
      style={[styles.track, style]}
    >
      <ScrollView
        ref={scroller}
        horizontal
        showsHorizontalScrollIndicator={false}
        // Normal deceleration, and momentum deliberately left free to run
        // across as many days as the flick carries: a light nudge steps a day
        // or two, a hard swipe coasts weeks before settling. `snapToInterval`
        // still lands it exactly on a stroke wherever it runs out.
        decelerationRate="normal"
        snapToInterval={ITEM_WIDTH}
        snapToAlignment="start"
        scrollEventThrottle={16}
        onScroll={handleScroll}
        contentOffset={initialOffset}
        onContentSizeChange={() => {
          // `contentOffset` alone does not land on every platform; place the
          // selected day on the centre line once, on the first measure.
          if (positioned.current) return;
          positioned.current = true;
          scroller.current?.scrollTo({
            x: offsetFor(activeRef.current),
            animated: false,
          });
        }}
        contentContainerStyle={{ paddingHorizontal: sidePad }}
        style={styles.scroll}
      >
        {Array.from({ length: totalDays }).map((_, i) => {
          const d = Math.abs(i - active);
          return (
            <View key={i} style={styles.slot}>
              <View
                style={[
                  styles.tick,
                  { opacity: Math.max(0.06, 1 - d * 0.075) },
                ]}
              />
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: TRACK_HEIGHT,
    alignSelf: 'stretch',
  },
  scroll: {
    flex: 1,
  },
  slot: {
    width: ITEM_WIDTH,
    height: TRACK_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: {
    height: TICK_HEIGHT,
    width: TICK_WIDTH,
    borderRadius: 2,
    backgroundColor: colors.ink,
  },
});

export default DayScrubber;
