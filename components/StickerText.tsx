import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { absoluteFill, colors } from '@/constants/theme';
import { Text } from './Text';

/**
 * Display type cut out as a sticker: black letterforms inside a thick white
 * outline that follows their shape, the way a die-cut word sits on a scrapbook
 * page.
 *
 * React Native has no text stroke, so the outline is drawn rather than
 * declared: the same word is laid down once in white for each direction around
 * a circle, each copy nudged out by the stroke width, and the black word set on
 * top of the pile.
 */

/**
 * Directions the white copies are thrown in. Twelve rather than eight: at eight
 * the outline of a heavy display cut comes out lumpy where two arms meet, and
 * the gaps read as a rendering fault rather than as a die-cut edge.
 */
const POINTS = Array.from({ length: 12 }, (_, i) => {
  const angle = (i * Math.PI) / 6;
  return { x: Math.cos(angle), y: Math.sin(angle) };
});

export interface StickerTextProps {
  children: string;
  /** How far the outline stands off the letterforms. */
  stroke?: number;
  /** Degrees off straight — a sticker is never applied square. */
  tilt?: number;
  size?: 'hero' | 'headline' | 'headlineSm' | 'title';
  style?: StyleProp<ViewStyle>;
}

export function StickerText({
  children,
  stroke = 6,
  tilt = 0,
  size = 'headline',
  style,
}: StickerTextProps) {
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={children}
      style={[
        styles.root,
        tilt ? { transform: [{ rotate: `${tilt}deg` }] } : null,
        style,
      ]}
    >
      {POINTS.map((point, i) => (
        <Text
          key={i}
          variant={size}
          color={colors.inkInverse}
          // The outline is decoration on a word the black copy already reads
          // out; left visible to a screen reader it says the day eight times.
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.outline,
            {
              transform: [
                { translateX: point.x * stroke },
                { translateY: point.y * stroke },
              ],
            },
          ]}
        >
          {children}
        </Text>
      ))}

      <Text variant={size} color={colors.ink}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'flex-start',
  },
  /**
   * Every white copy is taken out of the flow and pinned to where the black one
   * lands, so the block measures one word rather than nine stacked.
   */
  outline: {
    ...absoluteFill,
  },
});

export default StickerText;
