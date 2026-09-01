import { LinearGradient } from 'expo-linear-gradient';
import { useRef } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, fonts, gradients, radii, shadows } from '@/constants/theme';
import { GlassSurface } from './GlassSurface';
import { Avatar, type AvatarSource } from './Avatar';
import { Text } from './Text';

/**
 * What the ring around the avatar is saying about the day, the way a story
 * ring does: `full` for a day finished outright, `partial` for one with proof
 * photos on it but tasks still open, `none` for a day with nothing to show.
 *
 * All three are drawn. An empty day used to be painted in the page's own
 * colour, which left the avatar looking unringed rather than un-started — so
 * `none` is a grey too, just the lighter of the two.
 */
export type DayRingState = 'full' | 'partial' | 'none';

export interface DayRingProps {
  day: number;
  /** Defaults to the story ring, which is what every other screen wants. */
  state?: DayRingState;
  /** Seed for the avatar image; null renders the grey silhouette. */
  avatarSeed?: string | null;
  /** A real profile photo, which stands in for the seed once there is one. */
  avatar?: AvatarSource;
  size?: number;
  onPress?: () => void;
  /** Double tap on the "Day N" pill — the way back to today from a scrubbed
   * day. A single tap does nothing, so it cannot be hit by accident. */
  onDoublePressDay?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** How close two taps have to fall to count as one gesture. */
const DOUBLE_TAP_MS = 280;

const RING_WIDTH = 3.5;
/** No gap: the photo runs right up under the band, so the page colour never
 * shows as a pale circle between the two. */
const RING_GAP = 0;

/**
 * Diameter of the avatar inside a ring of `size`. Screens that show the same
 * circle without a ring around it read it from here, so the photo comes out
 * the same size on both.
 */
export const ringInnerSize = (size: number) => size - (RING_WIDTH + RING_GAP) * 2;

/**
 * Avatar wrapped in the story ring, with the "Day N" pill overlapping
 * its bottom edge. The pill is the same liquid-glass lens as the tab bar, so
 * the avatar smears through it where the two overlap; both it and the ring cast
 * the hard, offset drop the sticky note does, which is what keeps them sitting
 * on the page rather than floating over it. Tapping the ring opens the day's
 * story; double-tapping the pill jumps back to today.
 */
export function DayRing({
  day,
  state = 'full',
  avatarSeed,
  avatar,
  size = 120,
  onPress,
  onDoublePressDay,
  style,
}: DayRingProps) {
  const ringWidth = RING_WIDTH;
  const inner = ringInnerSize(size);

  // One gradient either way, so the band keeps its width and the avatar never
  // shifts as the day fills in: only what is painted in it changes.
  const ring =
    state === 'full'
      ? gradients.storyRing
      : state === 'partial'
        ? ([colors.field, colors.field] as const)
        : ([colors.inkGhost, colors.inkGhost] as const);

  const lastTap = useRef(0);
  const handleDayPress = () => {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      // Cleared rather than left standing, so a third tap starts a fresh
      // gesture instead of firing again off the second.
      lastTap.current = 0;
      onDoublePressDay?.();
      return;
    }
    lastTap.current = now;
  };

  return (
    <View style={[styles.wrap, style]}>
      {/* The gradient cannot cast the drop itself: with no solid background of
          its own iOS has no shape to derive a shadow path from, and Android
          has nothing to raise. This disc, the ring's own size and the page's
          own colour, gives both a shape — and is covered by the ring anyway. */}
      <View
        style={[
          styles.ringShadow,
          shadows.hard,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Day ${day} story`}
          onPress={onPress}
          style={({ pressed }) => (pressed ? styles.pressed : undefined)}
        >
          <LinearGradient
            colors={ring}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={[
              styles.ring,
              { width: size, height: size, borderRadius: size / 2 },
            ]}
          >
            <View
              style={[
                styles.ringInset,
                {
                  width: size - ringWidth * 2,
                  height: size - ringWidth * 2,
                  borderRadius: (size - ringWidth * 2) / 2,
                },
              ]}
            >
              <Avatar source={avatar ?? avatarSeed} size={inner} />
            </View>
          </LinearGradient>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Day ${day}`}
        accessibilityHint={
          onDoublePressDay ? 'Double tap to go back to today' : undefined
        }
        onPress={onDoublePressDay ? handleDayPress : undefined}
        style={styles.dayPillWrap}
      >
        {/* The lens cannot clip its children and cast a shadow at once, so
            the drop lives on this wrapper rather than on the glass. */}
        <View style={[styles.dayPillShadow, shadows.hard]}>
          <GlassSurface radius={radii.pill} shadow={false}>
            <View style={styles.dayPill}>
              <Text variant="button" style={styles.dayText}>
                Day {day}
              </Text>
            </View>
          </GlassSurface>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  ringShadow: {
    backgroundColor: colors.background,
  },
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInset: {
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPillWrap: {
    marginTop: -18,
  },
  dayPillShadow: {
    borderRadius: radii.pill,
    // Left unfilled on purpose: a background here would sit *behind* the lens
    // in the hierarchy, so the blur would sample it instead of the avatar and
    // the pill would flatten back into an opaque chip.
  },
  dayPill: {
    paddingHorizontal: 18,
    height: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontFamily: fonts.bodyBold,
    fontSize: 19,
    lineHeight: 24,
  },
  pressed: {
    opacity: 0.9,
  },
});

export default DayRing;
