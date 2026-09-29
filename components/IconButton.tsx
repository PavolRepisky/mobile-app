import { Ionicons } from '@expo/vector-icons';
import { createContext, useContext } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, shadows } from '@/constants/theme';
import { GlassSurface } from './GlassSurface';

/**
 * Set by `ScreenHeader`'s bar, so every button in it — its own back button
 * and whatever a screen passes as `right` — takes the header's tighter
 * shadow without each caller having to ask for it.
 */
export const InHeaderBar = createContext(false);

/** The round corner buttons on a tab root's title line — My Profile's QR and
 * Settings, the Challenges "+", Tasks' settings — and the photo viewer's
 * actions, all one size wherever they sit. */
export const cornerButtonSize = 46;
export const cornerIconSize = 22;

export interface IconButtonProps {
  name: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  size?: number;
  iconSize?: number;
  color?: string;
  /**
   * A flat fill instead of the lens — for the buttons that have to disappear
   * into the page rather than float over it.
   */
  background?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  shadow?: boolean;
  /** Can't be pressed right now — the glyph drops to `inkGhost`, the app's
   * "not available" grey, and the button stops taking taps. */
  disabled?: boolean;
}

/**
 * The circular button used for back / close / edit throughout the app. It is
 * liquid glass by default: these sit *over* the page rather than in it, so
 * they take the same lens as the reaction bubbles.
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
  disabled,
}: IconButtonProps) {
  const inHeader = useContext(InHeaderBar);
  const radius = size / 2;
  const box: ViewStyle = {
    width: size,
    height: size,
    borderRadius: radius,
  };

  const glyph = (
    <Ionicons name={name} size={iconSize ?? size * 0.44} color={disabled ? colors.inkGhost : color} />
  );

  // The lens sizes itself to its content, so the dimensions live on the inner
  // view rather than on the surface.
  const body = background ? (
    <View
      style={[
        styles.base,
        box,
        { backgroundColor: background },
        shadow && (inHeader ? shadows.header : shadows.soft),
      ]}
    >
      {glyph}
    </View>
  ) : (
    <GlassSurface radius={radius} shadow={shadow}>
      <View style={[styles.base, box]}>{glyph}</View>
    </GlassSurface>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? name}
      accessibilityState={disabled ? { disabled: true } : undefined}
      disabled={disabled}
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
