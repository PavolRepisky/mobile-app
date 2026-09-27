import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, glass, shadows } from '@/constants/theme';
import { GlassSurface } from './GlassSurface';

export interface IconButtonProps {
  name: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  size?: number;
  iconSize?: number;
  color?: string;
  /**
   * A flat fill instead of the frost — for the buttons that are an action in
   * their own right (the solid ink "+") or have to disappear into the page.
   */
  background?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  shadow?: boolean;
}

/**
 * The circular button used for back / close / edit throughout the app. It is
 * frosted by default: these sit *over* the page rather than in it, so they
 * wear the same frost as the tab bar.
 */
export function IconButton({
  name,
  onPress,
  size = 52,
  iconSize,
  color = colors.ink,
  background,
  style,
  accessibilityLabel,
  shadow = true,
}: IconButtonProps) {
  const radius = size / 2;
  const box: ViewStyle = {
    width: size,
    height: size,
    borderRadius: radius,
  };

  const glyph = <Ionicons name={name} size={iconSize ?? size * 0.44} color={color} />;

  // The frost sizes itself to its content and adds its rim outside it, so the
  // inner view gives the rim back — the button comes out `size` across either
  // way.
  const inner = size - glass.rimWidth * 2;
  const frostBox: ViewStyle = { width: inner, height: inner, borderRadius: inner / 2 };

  const body = background ? (
    <View
      style={[
        styles.base,
        box,
        { backgroundColor: background },
        shadow && shadows.soft,
      ]}
    >
      {glyph}
    </View>
  ) : (
    <GlassSurface radius={radius} shadow={shadow}>
      <View style={[styles.base, frostBox]}>{glyph}</View>
    </GlassSurface>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? name}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [pressed && styles.pressed, style]}
    >
      {body}
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
