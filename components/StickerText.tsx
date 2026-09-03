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
 * Directions the white copies are thrown in, for a given stroke.
 *
 * Each copy covers the ground from the letterform out to the stroke along its
 * own direction, so what falls between two neighbours is a scallop, and the gap
 * between them grows with the stroke: a count that reads as a clean die-cut at
 * six points wide comes out fluted at fourteen. Three directions per point of
 * stroke keeps that chord under a pixel or so, floored at twelve so a hairline
 * outline still closes and capped so a very thick one does not lay down a
 * hundred copies of the same word.
 */
function pointsFor(stroke: number) {
  const count = Math.min(48, Math.max(12, Math.ceil(stroke * 3)));
  return Array.from({ length: count }, (_, i) => {
    const angle = (i * 2 * Math.PI) / count;
    return { x: Math.cos(angle), y: Math.sin(angle) };
  });
}

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
  const points = pointsFor(stroke);

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
      {points.map((point, i) => (
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
    // Shrink-wraps the word wherever it is put, so the caller decides where the
    // sticker goes rather than the sticker filling whatever it is dropped in.
    alignSelf: 'center',
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
