import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';

import { colors, radii, shadows } from '@/constants/theme';

export interface CardProps extends ViewProps {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Drops the shadow — for cards sitting on an already-light inset panel. */
  flat?: boolean;
  /** Corner radius, off the shared scale. Defaults to the signature `card` cut. */
  radius?: number;
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
  onPress,
  flat,
  radius,
  style,
  children,
  ...rest
}: CardProps) {
  const radiusStyle = radius !== undefined && { borderRadius: radius };
  const host = [
    styles.card,
    radiusStyle,
    !flat && shadows.card,
    style,
  ];
  const inner = (
    <View style={[styles.clip, radiusStyle]}>{children}</View>
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
  pressed: {
    opacity: 0.92,
  },
});

export default Card;
