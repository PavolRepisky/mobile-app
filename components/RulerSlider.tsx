import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { absoluteFill, colors, spacing } from '@/constants/theme';
import { Pill } from './Pill';
import { Text } from './Text';

const TICK_SPACING = 16;

/**
 * Ticks are heaviest under the selection and thin out from there, over this
 * many of them. Past the taper they all sit at the light end.
 */
const TICK_WIDTH = { near: 3, far: 1.5 } as const;
const TICK_TAPER = 6;

export interface RulerSliderProps {
  /** One entry per tick. */
  length: number;
  index: number;
  onChange: (index: number) => void;
  /** Text in the floating pill above the ruler ("Today", "75 days"). */
  readout: string;
  /**
   * Caption under the ruler. A node rather than a string so the length picker
   * can pass a `<DateRange>` (whose arrow is an icon, not a glyph).
   */
  caption?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * The tick-mark picker used for both the start date and the challenge length.
 * A fixed indicator sits at the centre and the ruler scrolls beneath it; ticks
 * fade with distance from the selection.
 */
export function RulerSlider({
  length,
  index,
  onChange,
  readout,
  caption,
  style,
}: RulerSliderProps) {
  const [width, setWidth] = useState(0);
  const scroller = useRef<ScrollView>(null);
  const settled = useRef(index);
  const lastTick = useRef(0);
  const positioned = useRef(false);

  const sidePad = Math.max(0, width / 2 - TICK_SPACING / 2);
  const offsetFor = (i: number) => i * TICK_SPACING;

  /**
   * Where the scroller starts, fixed at mount. iOS re-applies `contentOffset`
   * whenever the prop changes, so deriving it from the selection turns every
   * scroll event into a fresh seek: the offset is set mid-flight, which cuts
   * the deceleration short before it has snapped and leaves the ruler resting
   * between two ticks. Held in a ref, the prop never changes and iOS is left
   * to finish the scroll it started. Everything after mount goes through
   * `scrollTo`.
   */
  const initialOffset = useRef({ x: offsetFor(index), y: 0 }).current;

  // A selection set from outside this scroller: follow it rather than fight
  // it. The echo of our own `onChange` is already settled, so it stops here.
  useEffect(() => {
    if (index === settled.current) return;
    settled.current = index;
    scroller.current?.scrollTo({ x: offsetFor(index), animated: true });
  }, [index]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / TICK_SPACING);
    const clamped = Math.min(Math.max(next, 0), length - 1);
    if (clamped !== settled.current) {
      settled.current = clamped;
      // The same detent tick the day scrubber plays, thinned the same way: a
      // hard flick crosses ticks faster than the taptic engine can sound them,
      // and past a few per frame the feedback lags the scroll instead of
      // reading as notches under the thumb.
      const now = Date.now();
      if (Platform.OS !== 'web' && now - lastTick.current >= 25) {
        lastTick.current = now;
        Haptics.selectionAsync().catch(() => {});
      }
      onChange(clamped);
    }
  };

  return (
    <View style={style} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={styles.readout}>
        <Pill label={readout} size="lg" style={styles.pill} />
      </View>

      <View style={styles.rulerWrap}>
        <ScrollView
          ref={scroller}
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={TICK_SPACING}
          snapToAlignment="start"
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingHorizontal: sidePad }}
          contentOffset={initialOffset}
          onContentSizeChange={() => {
            // `contentOffset` alone does not land on every platform, and the
            // side padding only exists once the track has been measured, which
            // moves every tick. Place the selection on the centre line once.
            if (positioned.current) return;
            positioned.current = true;
            scroller.current?.scrollTo({
              x: offsetFor(settled.current),
              animated: false,
            });
          }}
        >
          {Array.from({ length }).map((_, i) => {
            const distance = Math.abs(i - index);
            // Falls away faster than it used to, so the run either side of the
            // selection carries the eye and the far ends barely register.
            const opacity = Math.max(0.06, 1 - distance / 9);
            // Weight carries the same falloff as the fade, a tick or two
            // wider: the selection sits in the thick of the ruler rather than
            // just in its darkest part.
            const taper = Math.max(0, 1 - distance / TICK_TAPER);
            const width =
              TICK_WIDTH.far + (TICK_WIDTH.near - TICK_WIDTH.far) * taper;
            return (
              <View key={i} style={styles.tickCell}>
                <View style={[styles.tick, { opacity, width }]} />
              </View>
            );
          })}
        </ScrollView>

        {/* Fixed selection indicator. */}
        <View pointerEvents="none" style={styles.indicatorWrap}>
          <View style={styles.indicator} />
        </View>
      </View>

      {typeof caption === 'string' ? (
        <Text variant="bodyStrong" center style={styles.caption}>
          {caption}
        </Text>
      ) : caption ? (
        <View style={[styles.caption, styles.captionNode]}>{caption}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  readout: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  // Pill shrink-wraps itself against the leading edge, which overrides the
  // wrapper's alignItems; the readout has to claim the centre for itself.
  pill: {
    alignSelf: 'center',
  },
  rulerWrap: {
    height: 56,
    justifyContent: 'center',
  },
  tickCell: {
    width: TICK_SPACING,
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
  },
  // Width is set per tick, from how far it sits from the selection.
  tick: {
    height: 30,
    borderRadius: 1,
    backgroundColor: colors.ink,
  },
  indicatorWrap: {
    ...absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    width: 4,
    height: 46,
    borderRadius: 2,
    backgroundColor: colors.ink,
  },
  caption: {
    marginTop: spacing.lg,
  },
  captionNode: {
    alignItems: 'center',
  },
});

export default RulerSlider;
