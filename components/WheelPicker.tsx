import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
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

import { colors, radii } from '@/constants/theme';
import { Text } from './Text';

/** One row of the wheel; also the snap interval. The height iOS gives its own
 * date wheel's rows, so the drum reads at the size people know it at. */
const ROW_HEIGHT = 40;
/** Rows in view at once — the selected one and a neighbour either side. Five
 * left two blank rows under the last value (this year, where the wheel
 * usually sits), padding the sheet out with nothing; three is enough to read
 * as a drum and leaves at most one. */
const VISIBLE_ROWS = 3;

export interface WheelPickerProps<T extends string | number> {
  values: readonly T[];
  value: T;
  /** Fired as each row crosses the centre line, not just on release. */
  onChange: (value: T) => void;
  /** How a value is printed. Defaults to `String(value)`. */
  format?: (value: T) => string;
  style?: StyleProp<ViewStyle>;
}

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

/**
 * The iPhone's date-picker drum, one column of it: rows scroll under a
 * rounded band in the middle and snap into it, the row in the band full ink
 * and its neighbours in the muted text grey. Every row that
 * crosses the band fires a selection tick, the same detent `DayScrubber`
 * gives its strokes. Drawn in JS rather than the native picker so it needs
 * no extra native module and sets its rows in the app's own type.
 */
export function WheelPicker<T extends string | number>({
  values,
  value,
  onChange,
  format = String,
  style,
}: WheelPickerProps<T>) {
  const scroller = useRef<ScrollView>(null);
  const [active, setActive] = useState(() => Math.max(values.indexOf(value), 0));
  const activeRef = useRef(active);
  activeRef.current = active;
  const lastTick = useRef(0);

  /**
   * Where the drum starts, fixed at mount — iOS re-applies `contentOffset`
   * whenever the prop changes, so deriving it from the selection turns each
   * scroll event into a fresh seek (see `DayScrubber`). Android ignores the
   * prop entirely, which the layout pass below covers.
   */
  const initialOffset = useRef({ x: 0, y: active * ROW_HEIGHT }).current;

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = clamp(
      Math.round(e.nativeEvent.contentOffset.y / ROW_HEIGHT),
      0,
      values.length - 1,
    );
    if (index === activeRef.current) return;
    activeRef.current = index;
    setActive(index);
    // A hard flick passes rows faster than the taptic engine can play them;
    // the ripple is thinned rather than queued so it keeps up with the drum.
    const now = Date.now();
    if (Platform.OS !== 'web' && now - lastTick.current >= 25) {
      lastTick.current = now;
      Haptics.selectionAsync().catch(() => {});
    }
    onChange(values[index]);
  };

  return (
    <View style={[styles.frame, style]}>
      {/* Behind the rows, so the selected one reads as sitting in it. */}
      <View style={styles.band} pointerEvents="none" />
      <ScrollView
        ref={scroller}
        showsVerticalScrollIndicator={false}
        snapToInterval={ROW_HEIGHT}
        decelerationRate="fast"
        contentOffset={initialOffset}
        onLayout={() =>
          scroller.current?.scrollTo({ y: initialOffset.y, animated: false })
        }
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.content}
      >
        {/* The row in the band in ink, the rest in the text grey — flat
            colours rather than a faded ink, which would blend into a grey
            of its own that nothing else on the page uses. */}
        {values.map((item, index) => {
          return (
            <View key={String(item)} style={styles.row}>
              <Text
                variant="sectionTitleXs"
                color={index === active ? colors.ink : colors.inkMuted}
              >
                {format(item)}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: ROW_HEIGHT * VISIBLE_ROWS,
  },
  // Enough room above the first row and below the last for each to reach
  // the centre band.
  content: {
    paddingVertical: (ROW_HEIGHT * (VISIBLE_ROWS - 1)) / 2,
  },
  row: {
    height: ROW_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: (ROW_HEIGHT * (VISIBLE_ROWS - 1)) / 2,
    height: ROW_HEIGHT,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSunken,
  },
});

export default WheelPicker;
