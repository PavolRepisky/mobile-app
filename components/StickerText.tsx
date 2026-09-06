import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, shadows, type as typeScale } from '@/constants/theme';
import { Text } from './Text';

/**
 * A word die-cut as a sticker: black display type on a white plaque, applied
 * off straight.
 *
 * This was first drawn as a true outline — the word laid down many times in
 * white around a circle, black on top — and it does not survive being asked for
 * a thick one. Every copy is the whole glyph, so the union closes the counters
 * of the letters, bridges the gaps between them, and scallops wherever two
 * neighbouring copies meet. What comes out is a white amoeba with a word
 * somewhere inside it.
 *
 * The plaque gets the same idea with none of that: one shape, one edge, legible
 * at any size, and thicker is simply more paper rather than more artefact.
 */

/**
 * The paper around the word, as shares of its own type size, so a sticker cut
 * for a headline and one cut for a title come out the same object at two
 * scales. Wider than it is tall — the ends of a word need more room than its
 * shoulders, or the plaque reads as a button.
 */
const PAD_X = 0.62;
const PAD_Y = 0.3;

export interface StickerTextProps {
  children: string;
  /** Degrees off straight — a sticker is never applied square. */
  tilt?: number;
  size?: 'hero' | 'headline' | 'headlineSm' | 'title';
  style?: StyleProp<ViewStyle>;
}

export function StickerText({
  children,
  tilt = 0,
  size = 'headline',
  style,
}: StickerTextProps) {
  const { fontSize } = typeScale[size];

  return (
    <View
      style={[
        styles.plaque,
        {
          paddingHorizontal: Math.round(fontSize * PAD_X),
          paddingVertical: Math.round(fontSize * PAD_Y),
        },
        tilt ? { transform: [{ rotate: `${tilt}deg` }] } : null,
        style,
      ]}
    >
      <Text variant={size} color={colors.ink}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  plaque: {
    // Shrink-wraps the word, so the caller decides where the sticker goes
    // rather than the sticker filling whatever it is dropped in.
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    // The same tight, offset drop the prints carry: one more thing lying on
    // the pile rather than floating over it.
    ...shadows.hard,
  },
});

export default StickerText;
