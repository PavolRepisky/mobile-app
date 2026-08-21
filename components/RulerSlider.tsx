import { useRef, useState } from 'react';
import {
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

const TICK_SPACING = 19;

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

  const sidePad = Math.max(0, width / 2 - TICK_SPACING / 2);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / TICK_SPACING);
    const clamped = Math.min(Math.max(next, 0), length - 1);
    if (clamped !== settled.current) {
      settled.current = clamped;
      onChange(clamped);
    }
  };

  return (
    <View style={style} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={styles.readout}>
        <Pill label={readout} size="lg" />
      </View>

      <View style={styles.rulerWrap}>
        <ScrollView
          ref={scroller}
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={TICK_SPACING}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingHorizontal: sidePad }}
          contentOffset={{ x: index * TICK_SPACING, y: 0 }}
        >
          {Array.from({ length }).map((_, i) => {
            const distance = Math.abs(i - index);
            const opacity = Math.max(0.12, 1 - distance / 14);
            return (
              <View key={i} style={styles.tickCell}>
                <View style={[styles.tick, { opacity }]} />
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
  tick: {
    width: 2,
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
