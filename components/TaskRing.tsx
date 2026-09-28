import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors, gradients, layout, radii } from '@/constants/theme';
import { Avatar, type AvatarSource } from './Avatar';
import { ringWidth } from './DayRing';
import { Text } from './Text';

/** Clear air between the ring and the photo, so it reads as a gauge around
 * the face rather than a coloured border on it — My Profile's own rule. */
const RING_GAP = 3;
/** The visible gap between two segments, measured along the ring. */
const SEGMENT_GAP = 5;
/** The count badge, sized to sit across the ring's bottom edge the way the
 * profile's own badge sits across its bigger ring. */
const BADGE_HEIGHT = 20;
const BADGE_BORDER = 2;
/** A watched segment keeps its accent, washed out — still the ring's own
 * colour, so it reads as seen rather than as a different kind of mark, and
 * clearly quieter than what's new beside it. */
const WATCHED_OPACITY = 0.35;

/** Blends two `#RRGGBB` colours, `t` of the way from `a` to `b`. */
function mixHex(a: string, b: string, t: number): string {
  const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  return `#${[0, 1, 2]
    .map((i) =>
      Math.round(channel(a, i) + (channel(b, i) - channel(a, i)) * t)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

/** The accent at `t` of the way along it, spread evenly over its stops —
 * how a ring reads its colour off where a segment sits on the circle. */
export function accentAt(t: number): string {
  const stops = gradients.accent;
  const scaled = Math.min(Math.max(t, 0), 1) * (stops.length - 1);
  const i = Math.min(Math.floor(scaled), stops.length - 2);
  return mixHex(stops[i], stops[i + 1], scaled - i);
}

export interface TaskRingProps {
  avatar: AvatarSource;
  done: number;
  total: number;
  /** How many of the done segments you've already watched as stories —
   * they're drawn in a faded accent. */
  watched?: number;
  /** Outer diameter, ring included. */
  size: number;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * A face in the app's split ring: one segment per task, filled clockwise from
 * 12 o'clock as they get done, each done segment wearing the accent where it
 * sits on the circle — My Profile's ring at the size of a story row, with the
 * same "3/5" badge clipped across its bottom. It only means anything while a
 * day is under way, so it is what stands for someone still going.
 *
 * Where it leads to a story, the done segments you've already watched fade
 * from the start of the ring, so only what's new wears the accent at full
 * strength.
 */
export function TaskRing({
  avatar,
  done,
  total,
  watched = 0,
  size,
  onPress,
  accessibilityLabel,
  style,
}: TaskRingProps) {
  const radius = (size - ringWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const count = Math.max(total, 1);
  const slot = circumference / count;
  // Round caps grow each arc by half a stroke at either end, so the drawn
  // length gives that back to keep the gaps the size they say.
  const length = count === 1 ? circumference : Math.max(0.01, slot - SEGMENT_GAP - ringWidth);
  const inset = count === 1 ? 0 : (((SEGMENT_GAP + ringWidth) / 2) / circumference) * 360;
  const avatarSize = size - (ringWidth + RING_GAP) * 2;
  const centre = size / 2;

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel ?? `${done} of ${total} tasks done`}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [{ width: size, height: size }, pressed && styles.pressed, style]}
    >
      <Svg width={size} height={size} style={styles.ring}>
        {Array.from({ length: count }, (_, i) => (
          <Circle
            key={i}
            cx={centre}
            cy={centre}
            r={radius}
            stroke={i < done ? accentAt((i + 0.5) / count) : colors.inkGhost}
            strokeOpacity={i < Math.min(watched, done) ? WATCHED_OPACITY : 1}
            strokeWidth={ringWidth}
            strokeLinecap={count > 1 ? 'round' : 'butt'}
            fill="none"
            strokeDasharray={`${length} ${circumference}`}
            transform={`rotate(${-90 + (i * 360) / count + inset} ${centre} ${centre})`}
          />
        ))}
      </Svg>
      <View style={[styles.photo, { top: ringWidth + RING_GAP, left: ringWidth + RING_GAP }]}>
        <Avatar source={avatar} size={avatarSize} />
      </View>
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.badge}
      >
        <Text variant="badge" color={colors.inkInverse}>
          {`${done}/${total}`}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
  },
  photo: {
    position: 'absolute',
  },
  // Centred on the ring's bottom stroke, ringed in the page's white so it
  // reads as sitting on the gauge rather than merging into it.
  badge: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: -(BADGE_HEIGHT - ringWidth) / 2,
    height: BADGE_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: layout.pill,
    borderRadius: radii.pill,
    borderWidth: BADGE_BORDER,
    borderColor: colors.backgroundPlain,
    backgroundColor: colors.ink,
  },
  pressed: {
    opacity: 0.85,
  },
});

export default TaskRing;
