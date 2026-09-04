import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
  type NativeSyntheticEvent,
  type StyleProp,
  type TextLayoutEventData,
  type TextLayoutLine,
  type ViewStyle,
} from 'react-native';

import { absoluteFill, colors, spacing, type } from '@/constants/theme';
import { Text } from './Text';

/**
 * The empty circle's outline: its weight, and how far outside the circle it
 * sits. Dashed at the same weight the collage's empty slots are, because they
 * are the day's two ways of drawing the same thing — a place waiting to be
 * filled — and a hollow ring next to a dashed tile reads as two different
 * states rather than one.
 *
 * Laid around the circle rather than bordered onto it. A border is drawn
 * inside the box, which cuts its own weight out of the shape: the ink that
 * floods in on a tick then lands a rim smaller than the outline that promised
 * it, and the dashes read as a groove in the circle instead of a line about
 * to be filled.
 */
const RING = 1.75;

export interface CheckCircleProps {
  checked: boolean;
  size?: number;
  onPress?: () => void;
  /**
   * Glyph drawn inside the circle while it is still empty — the camera on the
   * to-do rows, where pressing the circle is what opens the viewfinder. Left
   * off wherever the circle is only reporting a state, so a hollow circle
   * never reads as something to press.
   */
  emptyIcon?: keyof typeof Ionicons.glyphMap;
}

/** Filled circle with a white tick, or a hollow outline when undone. */
export function CheckCircle({
  checked,
  size = 36,
  onPress,
  emptyIcon,
}: CheckCircleProps) {
  // 0 = empty outline, 1 = filled and ticked. Held in a value rather than
  // swapped outright so ticking a task reads as the ink flooding the circle
  // and the check landing on top of it, which is the moment worth animating.
  const fill = useRef(new Animated.Value(checked ? 1 : 0)).current;
  const settled = useRef(false);

  useEffect(() => {
    // The first pass is the row appearing, not the user ticking anything:
    // land on the final state without playing the animation at it.
    if (!settled.current) {
      settled.current = true;
      fill.setValue(checked ? 1 : 0);
      return;
    }
    Animated.spring(fill, {
      toValue: checked ? 1 : 0,
      useNativeDriver: true,
      friction: 6,
      tension: 140,
    }).start();
  }, [checked, fill]);

  // Springs overshoot at both ends; the left clamp keeps the undershoot from
  // flipping the tick inside out, while the right end is left free to pop.
  const grow = (from: number) =>
    fill.interpolate({
      inputRange: [0, 1],
      outputRange: [from, 1],
      extrapolateLeft: 'clamp',
    });

  const body = (
    <View
      style={[
        styles.check,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      {/* Fades out under the ink rather than being covered by it: the ring
          stands outside the circle, so there is nothing the fill could grow
          to that would paint over it. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ring,
          {
            borderRadius: size / 2 + RING,
            borderColor: colors.field,
            opacity: fill.interpolate({
              inputRange: [0, 0.5],
              outputRange: [1, 0],
              extrapolate: 'clamp',
            }),
          },
        ]}
      />

      <Animated.View
        style={[
          styles.fill,
          {
            // The circle carries no border now, so its box is the shape: the
            // ink fills it corner to corner with nothing to cover.
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.ink,
            opacity: fill,
            transform: [{ scale: grow(0.2) }],
          },
        ]}
      />
      {emptyIcon ? (
        <Animated.View
          style={[
            styles.glyph,
            {
              // Gone by the time the ink is half in, so the tick lands on a
              // clean circle rather than crossing the glyph on its way.
              opacity: fill.interpolate({
                inputRange: [0, 0.5],
                outputRange: [1, 0],
                extrapolate: 'clamp',
              }),
            },
          ]}
        >
          <Ionicons name={emptyIcon} size={size * 0.44} color={colors.inkMuted} />
        </Animated.View>
      ) : null}

      <Animated.View
        style={{
          opacity: fill.interpolate({
            inputRange: [0, 0.45, 1],
            outputRange: [0, 0, 1],
            extrapolateLeft: 'clamp',
          }),
          transform: [{ scale: grow(0.5) }],
        }}
      >
        <Ionicons
          name="checkmark"
          size={size * 0.62}
          color={colors.inkInverse}
        />
      </Animated.View>
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}
    >
      {body}
    </Pressable>
  );
}

export interface TaskRowProps {
  label: string;
  done: boolean;
  /** Completion time, e.g. "7:19am". Only shown once done. */
  time?: string | null;
  /**
   * The row's only control. A task is still ticked off by photographing it, so
   * pressing the circle is what opens the viewfinder — the camera inside it is
   * the invitation. The proof itself is not on the row any more: it goes into
   * the day's collage, which is where the pictures are looked at.
   */
  onPressPhoto?: () => void;
  /** Last row in a card omits its divider. */
  divider?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Thickness of the animated strike, and how long it takes to draw. */
const STRIKE = 1.5;
const STRIKE_MS = 340;

/**
 * The completion stamp keeps its line in the flow whether or not a task is
 * done, so the height it holds open — its line, plus the gap above it — is
 * what the body has to be offset by to sit the label on the circle's centre.
 * Positioning the stamp out of flow instead is the obvious-looking fix and is
 * wrong: a percentage offset resolves against the height the row hands down,
 * and drops the stamp onto the task below.
 */
const STAMP_GAP = 4;
const STAMP_BLOCK = type.body.lineHeight + STAMP_GAP;

/**
 * Where the rule crosses a line of text: through the middle of the lowercase
 * letters, not the middle of the line box. Falls back to proportions of the
 * line height on platforms that leave the font metrics at zero.
 */
function strikeTop(line: TextLayoutLine): number {
  const baseline =
    line.ascender > 0 ? line.y + line.ascender : line.y + line.height * 0.78;
  const half = line.xHeight > 0 ? line.xHeight / 2 : line.height * 0.18;
  return baseline - half - STRIKE / 2;
}

/**
 * Check circle + label + completion time. Completed tasks get a strikethrough
 * on the label as well as the filled circle — drawn as a rule that sweeps
 * across the text rather than a decoration that blinks on, since ticking a
 * task is the one moment this screen is really about.
 *
 * The proof photo used to sit on the row and carry the whole interaction. It
 * has moved to the day's collage, which shows the same shots larger and all at
 * once; what is left here is the state and the one control that changes it, at
 * a quarter of the height.
 */
export function TaskRow({
  label,
  done,
  time,
  onPressPhoto,
  divider = true,
  style,
}: TaskRowProps) {
  // Measured line boxes for the label. Empty until the text has laid out —
  // and on platforms without `onTextLayout`, empty for good, which is what
  // the static decoration below falls back to.
  const [lines, setLines] = useState<readonly TextLayoutLine[]>([]);
  const drawn = lines.length > 0;

  const strike = useRef(new Animated.Value(done ? 1 : 0)).current;
  const stamp = useRef(new Animated.Value(done && time ? 1 : 0)).current;
  const settled = useRef(false);

  // The stamp is cleared from state the moment a task is un-ticked; holding
  // the last one lets it fade out with something still in it.
  const lastTime = useRef(time);
  if (time) lastTime.current = time;

  useEffect(() => {
    const shown = done ? 1 : 0;
    // The first pass is the row appearing, not the user ticking anything.
    if (!settled.current) {
      settled.current = true;
      strike.setValue(shown);
      stamp.setValue(shown);
      return;
    }
    Animated.parallel([
      Animated.timing(strike, {
        toValue: shown,
        duration: STRIKE_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(stamp, {
        toValue: shown,
        duration: 260,
        // Trails the rule rather than racing it: the line lands, the time
        // follows it in.
        delay: done ? STRIKE_MS * 0.55 : 0,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [done, strike, stamp]);

  const handleTextLayout = (e: NativeSyntheticEvent<TextLayoutEventData>) => {
    const next = e.nativeEvent.lines.filter((line) => line.width > 0);
    setLines((prev) =>
      prev.length === next.length &&
      prev.every((line, i) => line.width === next[i].width && line.y === next[i].y)
        ? prev
        : next,
    );
  };

  // One rule per line, drawn end to end: the sweep runs off the first line and
  // straight onto the second rather than striking both at once.
  const rules = useMemo(() => {
    const total = lines.reduce((sum, line) => sum + line.width, 0);
    if (total <= 0) return [];
    let drawnSoFar = 0;
    return lines.map((line) => {
      const from = drawnSoFar / total;
      drawnSoFar += line.width;
      return {
        left: line.x,
        top: strikeTop(line),
        width: strike.interpolate({
          inputRange: [from, drawnSoFar / total],
          outputRange: [0, line.width],
          extrapolate: 'clamp',
        }),
      };
    });
  }, [lines, strike]);

  return (
    <View style={[styles.row, divider && styles.divider, style]}>
      <CheckCircle
        checked={done}
        // Only where the circle can actually be pressed. On a friend's list a
        // camera would be inviting you to photograph their day.
        emptyIcon={onPressPhoto ? 'camera' : undefined}
        onPress={onPressPhoto}
      />

      {/* The stamp's line is held open whether or not there is a time in it,
          which leaves the block half a stamp taller than the label and the
          label sitting that far above centre. Sitting the body half a stamp
          low cancels it while the task is open, and riding back to zero as
          the stamp lands leaves the two of them centred together. */}
      <Animated.View
        style={[
          styles.body,
          {
            transform: [
              {
                translateY: stamp.interpolate({
                  inputRange: [0, 1],
                  outputRange: [STAMP_BLOCK / 2, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View>
          <Text
            variant="taskLabel"
            onTextLayout={handleTextLayout}
            style={done && !drawn ? styles.struck : undefined}
          >
            {label}
          </Text>

          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {rules.map((rule, i) => (
              <Animated.View key={i} style={[styles.rule, rule]} />
            ))}
          </View>
        </View>

        {/* Always laid out, even with nothing in it: the stamp appearing must
            not shunt the label off its line. The body above compensates for
            the line this holds open. */}
        <Animated.View
          style={[
            styles.time,
            {
              opacity: stamp,
              transform: [
                {
                  translateY: stamp.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-4, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text variant="body" color={colors.inkMuted}>
            {lastTime.current ?? ' '}
          </Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    // The 118pt print used to set this height; with only the circle left the
    // row needs padding of its own, or the list closes up into a dense block.
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dividerStrong,
  },
  body: {
    flex: 1,
    // Only a leading gap: the label runs to the same inset on the right as the
    // circle keeps on the left.
    marginLeft: spacing.md,
  },
  /*
   * The label carries no size override: it sits at the scale's own `bodyBold`
   * and takes the width the photo left behind when it moved to the collage.
   */
  struck: {
    textDecorationLine: 'line-through',
  },
  time: {
    marginTop: STAMP_GAP,
  },
  rule: {
    position: 'absolute',
    height: STRIKE,
    borderRadius: STRIKE,
    backgroundColor: colors.ink,
  },
  check: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    top: -RING,
    left: -RING,
    right: -RING,
    bottom: -RING,
    borderWidth: RING,
    borderStyle: 'dashed',
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  glyph: {
    ...absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});

export default TaskRow;
