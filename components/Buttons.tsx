import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, shadows, spacing } from '@/constants/theme';
import { Text } from './Text';

interface BaseProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  /** Ionicon rendered to the left of the label — e.g. the share glyph on "Send invites". */
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
  /** Full-width is the default; pass false for the side-by-side pairs. */
  fullWidth?: boolean;
  /** White with ink type, for a button sitting on the camera's black — the
   * ink pill would vanish there. */
  inverse?: boolean;
}

/** Solid black pill. The app's single primary action style. */
export function PrimaryButton({
  label,
  onPress,
  disabled,
  icon,
  style,
  fullWidth = true,
  inverse,
}: BaseProps) {
  const ink = disabled ? colors.disabledInk : inverse ? colors.ink : colors.inkInverse;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        fullWidth && styles.fullWidth,
        disabled ? styles.primaryDisabled : inverse ? styles.inverse : styles.primary,
        !disabled && shadows.soft,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <View style={styles.row}>
        {icon ? (
          <Ionicons
            name={icon}
            size={19}
            color={ink}
            style={styles.icon}
          />
        ) : null}
        <Text variant="button" color={ink}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

/** Outer height of the primary pill. Exported for a screen
 * that pins one over its scroll and has to leave the content room under it. */
export const buttonHeight = 58;

const styles = StyleSheet.create({
  base: {
    height: buttonHeight,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  primary: {
    backgroundColor: colors.ink,
  },
  inverse: {
    backgroundColor: colors.surface,
  },
  primaryDisabled: {
    backgroundColor: colors.disabled,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: spacing.sm,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
});
