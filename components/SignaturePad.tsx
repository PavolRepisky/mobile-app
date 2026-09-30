import { useRef, useState } from 'react';
import {
  PanResponder,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, layout, radii, spacing } from '@/constants/theme';
import { Text } from './Text';

/** Tall enough for a signature's loops with room over the line, sampled off
 * the design. */
const PAD_HEIGHT = 180;

/** A felt-tip's weight: a hairline reads as a scribble, anything heavier as a
 * marker. */
const INK_WIDTH = 3;

/** The dashed edge, the same weight as the create form's dashed "Add a task"
 * — the app's one mark for "this is where something goes". */
const EDGE = 2;

/** The rule the name sits on, like the line on a paper form, and how far off
 * the pad's foot it runs — room under it for the caption. */
const BASELINE = 1.5;
const BASELINE_BOTTOM = 30;

type Point = readonly [number, number];

function toPath(stroke: readonly Point[]): string {
  if (stroke.length === 0) return '';
  const [first, ...rest] = stroke;
  // A tap with no drag still leaves a dot, the way a pen would.
  if (rest.length === 0) return `M${first[0]} ${first[1]} l0.1 0`;
  return `M${first[0]} ${first[1]}${rest.map(([x, y]) => ` L${x} ${y}`).join('')}`;
}

export interface SignaturePadProps {
  /** Under the line, the way a form prints who signs and when. */
  caption?: string;
  /** Fires with true on the first stroke and false once cleared. */
  onSignedChange: (signed: boolean) => void;
  /** True while a finger is down — a page that scrolls hands the drag to the
   * pad for that long, or every downstroke would scroll the page instead. */
  onDrawingChange?: (drawing: boolean) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * A dashed box to sign in with a finger: an ink line drawn wherever the
 * finger goes, over a baseline with the caption under it, and Clear in the
 * corner once there is something to clear.
 */
export function SignaturePad({
  caption,
  onSignedChange,
  onDrawingChange,
  style,
}: SignaturePadProps) {
  const [strokes, setStrokes] = useState<readonly (readonly Point[])[]>([]);
  const [width, setWidth] = useState(0);
  // Kept in a ref as well, so the responder made once on mount always sees
  // the latest callbacks rather than the first render's.
  const callbacks = useRef({ onSignedChange, onDrawingChange });
  callbacks.current = { onSignedChange, onDrawingChange };
  const signed = useRef(false);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Once the finger is down the line is the pad's, even as it drifts
      // down the page.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        setStrokes((list) => [...list, [[locationX, locationY]]]);
        callbacks.current.onDrawingChange?.(true);
        if (!signed.current) {
          signed.current = true;
          callbacks.current.onSignedChange(true);
        }
      },
      onPanResponderMove: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        setStrokes((list) => {
          const last = list[list.length - 1] ?? [];
          return [...list.slice(0, -1), [...last, [locationX, locationY] as Point]];
        });
      },
      onPanResponderRelease: () => callbacks.current.onDrawingChange?.(false),
      onPanResponderTerminate: () => callbacks.current.onDrawingChange?.(false),
    }),
  ).current;

  const clear = () => {
    setStrokes([]);
    signed.current = false;
    onSignedChange(false);
  };

  return (
    <View
      style={[styles.pad, style]}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
    >
      <View style={styles.baseline} pointerEvents="none" />
      {caption ? (
        <Text variant="badge" color={colors.inkMuted} style={styles.caption}>
          {caption}
        </Text>
      ) : null}

      <View style={StyleSheet.absoluteFill} {...responder.panHandlers}>
        {width > 0 ? (
          <Svg width={width} height={PAD_HEIGHT}>
            {strokes.map((stroke, i) => (
              <Path
                key={i}
                d={toPath(stroke)}
                stroke={colors.ink}
                strokeWidth={INK_WIDTH}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ))}
          </Svg>
        ) : null}
      </View>

      {strokes.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear signature"
          onPress={clear}
          hitSlop={spacing.sm}
          style={({ pressed }) => [styles.clear, pressed && styles.pressed]}
        >
          <Text variant="metaBold" color={colors.inkMuted}>
            Clear
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pad: {
    height: PAD_HEIGHT,
    borderRadius: radii.lg,
    borderWidth: EDGE,
    borderStyle: 'dashed',
    borderColor: colors.inkGhost,
    backgroundColor: colors.surface,
  },
  baseline: {
    position: 'absolute',
    left: layout.card,
    right: layout.card,
    bottom: BASELINE_BOTTOM,
    height: BASELINE,
    backgroundColor: colors.inkGhost,
  },
  caption: {
    position: 'absolute',
    left: layout.card,
    bottom: spacing.sm,
  },
  clear: {
    position: 'absolute',
    top: layout.heading,
    right: layout.block,
  },
  pressed: {
    opacity: 0.7,
  },
});

export default SignaturePad;
