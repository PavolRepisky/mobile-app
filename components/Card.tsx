import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';

import { colors, radii, shadows, spacing } from '@/constants/theme';

export interface CardProps extends ViewProps {
  /** Inner padding. `false` for edge-to-edge content like photo strips. */
  padded?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Drops the shadow — for cards sitting on an already-light inset panel. */
  flat?: boolean;
  /** Muted fill instead of pure white (invite card, task well). */
  muted?: boolean;
}

/**
 * White surface, rounded, very soft shadow. The app's workhorse container.
 *
 * The fill and the shadow sit on the outer view while the clip sits on the
 * inner one: on iOS a view cannot both clip its children and cast a shadow —
 * `overflow: 'hidden'` takes the shadow with it — so a card that did both drew
 * no shadow at all.
 */
export function Card({
  padded = true,
  onPress,
  flat,
  muted,
  style,
  children,
  ...rest
}: CardProps) {
  const host = [styles.card, muted && styles.muted, !flat && shadows.card, style];
  const inner = (
    <View style={[styles.clip, padded && styles.padded]}>{children}</View>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [...host, pressed && styles.pressed]}
        {...rest}
      >
        {inner}
      </Pressable>
    );
  }

  return (
    <View style={host} {...rest}>
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
  },
  clip: {
    borderRadius: radii.card,
    overflow: 'hidden',
  },
  muted: {
    backgroundColor: colors.surfaceMuted,
  },
  padded: {
    padding: spacing.xl,
  },
  pressed: {
    opacity: 0.92,
  },
});

export default Card;
