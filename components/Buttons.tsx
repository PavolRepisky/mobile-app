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
}

/** Solid black pill. The app's single primary action style. */
export function PrimaryButton({
  label,
  onPress,
  disabled,
  icon,
  style,
  fullWidth = true,
}: BaseProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        fullWidth && styles.fullWidth,
        disabled ? styles.primaryDisabled : styles.primary,
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
            color={disabled ? colors.disabledInk : colors.inkInverse}
            style={styles.icon}
          />
        ) : null}
        <Text variant="button" color={disabled ? colors.disabledInk : colors.inkInverse}>
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
