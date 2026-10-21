import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { absoluteFill, colors, radii } from '@/constants/theme';
import { Pill } from './Pill';

/**
 * Applied to the photo itself while locked — heavier than the canvas's 18,
 * which left too much of the shot readable on a phone. This is
 * the whole of the lock's blur: `Image`'s `blurRadius` blurs the pixels
 * directly, so it holds on every platform, where a backdrop blur has none on
 * web or older Android. Soft enough that the day's colours still show
 * through under `LockedOverlay`'s light wash, too soft to make out the shot.
 */
export const LOCK_BLUR_RADIUS = 50;

export interface LockedOverlayProps {
  /** `false` renders `children` plain — the gate this wraps hasn't shut. */
  locked: boolean;
  title: string;
  /** Tapping the lock's own pill, not the blurred content under it. */
  onPress?: () => void;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * Dims whatever it wraps and sets a pill naming the lock over the middle of
 * it — the Community feed's posts before a single task has been
 * proven with a photo. The photo blurs itself (the caller sets it on the
 * image, so it holds on every platform, backdrop blur or not), a light ink
 * wash settles it back, and the pill sits dead centre — the app's own white
 * `floating` pill, the one "Day 5" and "+10,000 joined" ride photos in, so
 * the lock reads as part of the app rather than a frosted one-off. The
 * content stays mounted underneath, its state intact for the moment it
 * unlocks, but `pointerEvents="none"` while locked: none of its own taps — a
 * like, a profile, the carousel — should fire through the lock.
 */
export function LockedOverlay({
  locked,
  title,
  onPress,
  radius = radii.lg,
  style,
  children,
}: LockedOverlayProps) {
  if (!locked) return <>{children}</>;

  return (
    <View style={[styles.root, { borderRadius: radius }, style]}>
      <View pointerEvents="none">{children}</View>

      <View style={[absoluteFill, styles.wash]} />

      <Pressable
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={title}
        onPress={onPress}
        style={[absoluteFill, styles.message]}
      >
        <Pill overMedia tone="floating" icon="lock-closed" label={title} bold style={styles.pill} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
  },
  wash: {
    backgroundColor: colors.scrimLock,
  },
  message: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // `Pill` shrink-wraps to the start of its row; the lock sits dead centre.
  pill: {
    alignSelf: 'center',
  },
});

export default LockedOverlay;
