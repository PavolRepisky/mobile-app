import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { absoluteFill, colors, layout, radii, shadows } from '@/constants/theme';
import { Text } from './Text';

/** The lock pill's height and glyph, taken off the canvas's locked post. */
const PILL_HEIGHT = 40;
const PILL_ICON = 16;
/** The pill's white rim — the canvas's inset ring, drawn as a border. */
const PILL_RIM = 1.5;

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
 * Dims whatever it wraps and sets a frosted pill naming the lock over the
 * middle of it — the Community feed's posts before a single task has been
 * proven with a photo. Drawn the way the canvas's locked post is: the photo
 * blurs itself (the caller sets it on the image, so it holds on every
 * platform, backdrop blur or not), a light ink wash settles it back, and the
 * pill sits dead centre. The content stays mounted underneath, its state
 * intact for the moment it unlocks, but `pointerEvents="none"` while locked:
 * none of its own taps — a like, a profile, the carousel — should fire
 * through the lock.
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
        <View style={styles.pill}>
          <Ionicons name="lock-closed" size={PILL_ICON} color={colors.inkInverse} />
          <Text variant="copyBold" color={colors.inkInverse}>
            {title}
          </Text>
        </View>
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
  // Frosted white over the blurred shot, rimmed brighter than its fill so
  // its edge holds against a pale photo, and lifted on the glass shadow.
  pill: {
    height: PILL_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.stack,
    paddingHorizontal: layout.block,
    borderRadius: radii.pill,
    borderWidth: PILL_RIM,
    borderColor: colors.frostRim,
    backgroundColor: colors.frost,
    ...shadows.glass,
  },
});

export default LockedOverlay;
