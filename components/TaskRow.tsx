import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type NativeSyntheticEvent,
  type StyleProp,
  type TextLayoutEventData,
  type TextLayoutLine,
  type ViewStyle,
} from 'react-native';

import { colors, spacing } from '@/constants/theme';
import { PhotoSlot } from './PhotoSlot';
import { Text } from './Text';

export interface CheckCircleProps {
  checked: boolean;
  size?: number;
  onPress?: () => void;
}

/** Big filled circle with a white tick, or a hollow outline when undone. */
export function CheckCircle({ checked, size = 46, onPress }: CheckCircleProps) {
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
          borderColor: colors.field,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            // Sized to the border box, not the content box, so the ink covers
            // the outline rather than leaving a grey rim around it.
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.ink,
            opacity: fill,
            transform: [{ scale: grow(0.2) }],
          },
        ]}
      />
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
  /** A photo the user actually took or picked. Wins over `photoSeed`. */
  photo?: ImageSourcePropType | null;
  /** Seed for the proof photo; null shows the empty camera tile. */
  photoSeed?: string | null;
  onToggle?: () => void;
  onPressPhoto?: () => void;
  /** Position in the card. Only used to alternate which way the photo leans. */
  index?: number;
  /** Last row in a card omits its divider. */
  divider?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * A degree and a half either side of straight at most — enough that no two
 * photos in a card sit at the same angle, little enough that you read it as
 * hand-placed rather than crooked. Seeded off the label so a row keeps its
 * angle across renders: the scrapbook feel comes from the photos not lining
 * up with each other, not from them shifting about. Zero is deliberately not
 * in the range, so every slot is off straight by something, and consecutive
 * rows always lean opposite ways.
 */
function tiltFor(label: string, index: number): number {
  let h = 0;
  for (let i = 0; i < label.length; i += 1) {
    h = (h * 31 + label.charCodeAt(i)) | 0;
  }
  // Magnitude off the label, direction off the position: seeding the sign as
  // well left neighbouring rows landing on the same angle often enough to
  // look like they had simply been set straight.
  const magnitude = 0.45 + (Math.abs(h) % 5) * 0.28;
  return index % 2 === 0 ? magnitude : -magnitude;
}

/** Thickness of the animated strike, and how long it takes to draw. */
const STRIKE = 1.5;
const STRIKE_MS = 340;

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
 * Photo slot + label + completion time + check circle. Completed tasks get a
 * strikethrough on the label, which is the app's main "done" signal — drawn
 * as a rule that sweeps across the text rather than a decoration that blinks
 * on, since ticking a task is the one moment this screen is really about.
 */
export function TaskRow({
  label,
  done,
  time,
  photo,
  photoSeed,
  onToggle,
  onPressPhoto,
  index = 0,
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
      <PhotoSlot
        photo={photo}
        seed={photoSeed}
        tilt={tiltFor(label, index)}
        shadow="hard"
        onPress={onPressPhoto}
      />

      <View style={styles.body}>
        <View>
          <Text
            variant="bodyBold"
            onTextLayout={handleTextLayout}
            style={[styles.label, done && !drawn && styles.struck]}
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
            not shunt the label off its line. */}
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
      </View>

      <CheckCircle checked={done} onPress={onToggle} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dividerStrong,
  },
  body: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  /** Slightly tighter than default body copy so labels hold two lines. */
  label: {
    fontSize: 15,
    lineHeight: 20,
  },
  struck: {
    textDecorationLine: 'line-through',
  },
  time: {
    marginTop: 4,
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
    borderWidth: 1.5,
  },
  fill: {
    position: 'absolute',
    top: -1.5,
    left: -1.5,
  },
  pressed: {
    opacity: 0.75,
  },
});

export default TaskRow;
