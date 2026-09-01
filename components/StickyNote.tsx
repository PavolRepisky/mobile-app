import {
  Pressable,
  StyleSheet,
  Text as RNText,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import {
  colors,
  fonts,
  shadows,
  stickyPalette,
} from '@/constants/theme';

export interface StickyNoteProps {
  /** Rendered in the handwriting face. */
  value: number | string;
  size?: number;
  /** Index into the pastel rotation. Defaults to deriving from a numeric value. */
  colorIndex?: number;
  /**
   * Torn-off state used by the post-it wall for days already elapsed:
   * no fill, no shadow, just a faint numeral where the note used to be.
   */
  muted?: boolean;
  /** Small random-looking tilt, seeded so it stays put across renders. */
  tilt?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * The app's signature motif: a pastel square with a hand-drawn numeral, tilted
 * a degree or two, with a tight directional shadow. Used as the task number in
 * the challenge editor, the day badge on the To-do home, and the 75-tile grid.
 */
export function StickyNote({
  value,
  size = 58,
  colorIndex,
  muted,
  tilt = 0,
  onPress,
  style,
}: StickyNoteProps) {
  const index =
    colorIndex ??
    (typeof value === 'number' ? value - 1 : String(value).length);
  const fill = stickyPalette[Math.abs(index) % stickyPalette.length];

  const body = (
    <View
      style={[
        styles.note,
        {
          width: size,
          height: size,
          backgroundColor: muted ? 'transparent' : fill,
          transform: [{ rotate: `${tilt}deg` }],
        },
        !muted && shadows.sticky,
        style,
      ]}
    >
      <RNText
        style={[
          styles.numeral,
          {
            fontSize: size * 0.56,
            // Caveat's numerals overshoot their em box in both directions:
            // the line box has to be tall enough to hold the ascenders, and
            // the text box wider than the note so the flick off the tail of a
            // "5" or "2" is not sliced off at the right edge. The box is
            // centred, so the extra width costs nothing visually.
            lineHeight: size * 0.74,
            width: size * 1.5,
            color: muted ? colors.field : colors.stickyInk,
          },
        ]}
      >
        {value}
      </RNText>
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Day ${value}`}
      onPress={onPress}
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  note: {
    alignItems: 'center',
    justifyContent: 'center',
    // Sticky notes are square with barely-there corners.
    borderRadius: 2,
  },
  numeral: {
    fontFamily: fonts.hand,
    textAlign: 'center',
    includeFontPadding: false,
    // Caveat sits high in its em box; nudge it back onto the optical centre.
    marginTop: 1,
  },
  pressed: {
    opacity: 0.8,
  },
});

export default StickyNote;
