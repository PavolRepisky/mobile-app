import {
  StyleSheet,
  Text as RNText,
  type TextProps as RNTextProps,
  type StyleProp,
  type TextStyle,
} from 'react-native';

import { colors, type as typeScale } from '@/constants/theme';

type Variant = keyof typeof typeScale;

/**
 * The trailing room a text style needs so its last glyph isn't clipped —
 * see `Text` below.
 */
function trackingRoom(style: StyleProp<TextStyle>): TextStyle | null {
  const flat = StyleSheet.flatten(style) ?? {};
  const tracking = flat.letterSpacing ?? 0;
  // A style that sets its own trailing padding has already made that room
  // (the month title does, with the glyph's overhang on top) — adding more
  // would override it rather than add to it.
  const padded = [flat.padding, flat.paddingHorizontal, flat.paddingRight, flat.paddingEnd].some(
    (value) => value !== undefined,
  );
  return tracking < 0 && !padded ? { paddingEnd: -tracking } : null;
}

export interface TextProps extends RNTextProps {
  variant?: Variant;
  color?: string;
  center?: boolean;
}

/**
 * Every string in the app goes through here so nothing falls back to the
 * platform system font.
 *
 * It also squares the text box with the app's tight tracking. Quicksand is
 * set a point tighter everywhere (`bodyTracking`), and the line is measured
 * as if the last glyph gave up its share of that spacing too — so the box
 * comes out that much short and clips the final letter: the "s" of a
 * toggle's "Members", the last digit of a reaction count. Giving the box that
 * amount back on its trailing side fixes it for every string at once, rather
 * than screen by screen as each clipped word turns up.
 */
export function Text({
  variant = 'body',
  color = colors.ink,
  center,
  style,
  ...rest
}: TextProps) {
  return (
    <RNText
      {...rest}
      style={[
        typeScale[variant],
        { color },
        center && { textAlign: 'center' },
        style,
        trackingRoom([typeScale[variant], style]),
      ]}
    />
  );
}

export default Text;
