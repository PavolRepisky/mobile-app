import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, shadows } from '@/constants/theme';

export interface IconButtonProps {
  name: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  size?: number;
  iconSize?: number;
  color?: string;
  background?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  shadow?: boolean;
}

/**
 * The circular white button used for back / close / edit throughout the app.
 */
export function IconButton({
  name,
  onPress,
  size = 52,
  iconSize,
  color = colors.ink,
  background = colors.surface,
  style,
  accessibilityLabel,
  shadow = true,
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? name}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: background,
        },
        shadow && shadows.soft,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Ionicons name={name} size={iconSize ?? size * 0.44} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
});

export default IconButton;
