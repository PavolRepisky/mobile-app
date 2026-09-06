import { Image } from 'expo-image';
import {
  Pressable,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, shadows } from '@/constants/theme';
import { Placeholder } from './Placeholder';
import { Text } from './Text';

/**
 * One instant print: a square photograph in a white frame with a deep chin
 * under it, captioned by hand.
 *
 * The chin is the whole thing. A photograph in an even border is a framed
 * picture; a photograph with four times as much paper below it as above is a
 * Polaroid, and the eye reads that shape before it reads anything in the
 * picture. It is also where the caption goes, which is what turns a grid of
 * proof shots into somebody's account of their day.
 *
 * Everything is proportional to `width`, so the same print is a thumbnail on
 * the To-do page and a full-bleed print on an exported card without a second
 * set of numbers.
 */

/** Paper down the sides and across the top, as a share of the frame's width. */
const BORDER = 0.055;

/** Paper under the picture. The four-to-one chin is the format's signature. */
const CHIN = 0.22;

/**
 * The paper's corner, as a share of the frame. Barely there on purpose: a
 * print is guillotined, not rounded, and any more reads as a UI card.
 */
const CORNER = 0.02;

/**
 * The caption's size, as a share of the frame. Tied to the print rather than
 * fixed, because a print is a thumbnail on one screen and a full-bleed picture
 * on an export — at one size the chin holds the caption and at the other it
 * ellipsises it halfway through a word.
 */
const CAPTION = 0.105;

/**
 * A print's height over its width. The picture window is square — the format
 * shoots square — so this is the two borders plus the chin around it.
 */
export const POLAROID_RATIO = BORDER + (1 - BORDER * 2) + CHIN;

export interface PolaroidProps {
  width: number;
  photo?: ImageSourcePropType | null;
  /** Seed for the drawn stand-in, where the shot is a placeholder. */
  seed?: string | null;
  /** Written in the chin. Nothing is written where there is nothing to say. */
  caption?: string;
  /** Degrees off straight. */
  tilt?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function Polaroid({
  width,
  photo,
  seed,
  caption,
  tilt = 0,
  onPress,
  accessibilityLabel,
  style,
}: PolaroidProps) {
  const border = Math.round(width * BORDER);
  const window = width - border * 2;
  const chin = Math.round(width * CHIN);

  const body = (
    <View
      style={[
        styles.frame,
        {
          width,
          paddingTop: border,
          paddingHorizontal: border,
          borderRadius: Math.round(width * CORNER),
        },
        tilt ? { transform: [{ rotate: `${tilt}deg` }] } : null,
        style,
      ]}
    >
      <View style={[styles.window, { width: window, height: window }]}>
        {photo ? (
          <Image source={photo} style={styles.photo} contentFit="cover" />
        ) : (
          <Placeholder seed={seed ?? 'print'} radius={0} style={styles.photo} />
        )}
      </View>

      <View style={[styles.chin, { height: chin }]}>
        {caption ? (
          // One line, never wrapped: a caption that runs to two lines in the
          // chin stops looking written on the print and starts looking typeset
          // into it.
          <Text
            variant="hand"
            color={colors.inkSoft}
            center
            numberOfLines={1}
            style={{
              fontSize: Math.round(width * CAPTION),
              lineHeight: Math.round(width * CAPTION * 1.2),
            }}
          >
            {caption}
          </Text>
        ) : null}
      </View>
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? caption}
      onPress={onPress}
      style={({ pressed }) => (pressed ? styles.pressed : null)}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: colors.surface,
    // The tight, offset drop the rest of the app's photographs carry: a print
    // lying on the page rather than a tile set into it.
    ...shadows.hard,
  },
  window: {
    // Showing through while the photograph decodes, so the window never
    // flashes empty white on the way in.
    backgroundColor: colors.undeveloped,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  chin: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});

export default Polaroid;
