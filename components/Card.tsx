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

/** White surface, 26px radius, very soft shadow. The app's workhorse container. */
export function Card({
  padded = true,
  onPress,
  flat,
  muted,
  style,
  children,
  ...rest
}: CardProps) {
  const content = [
    styles.card,
    muted && styles.muted,
    !flat && shadows.card,
    padded && styles.padded,
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [...content, pressed && styles.pressed]}
        {...rest}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={content} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
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
