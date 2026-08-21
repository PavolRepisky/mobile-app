import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radii, shadows, spacing, type } from '@/constants/theme';
import { Text } from './Text';

interface BaseProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
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
  loading,
  icon,
  style,
  fullWidth = true,
}: BaseProps) {
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive }}
      onPress={inactive ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        fullWidth && styles.fullWidth,
        inactive ? styles.primaryDisabled : styles.primary,
        !inactive && shadows.soft,
        pressed && !inactive && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.inkInverse} />
      ) : (
        <View style={styles.row}>
          {icon ? (
            <Ionicons
              name={icon}
              size={19}
              color={inactive ? colors.disabledInk : colors.inkInverse}
              style={styles.icon}
            />
          ) : null}
          <Text
            variant="button"
            color={inactive ? colors.disabledInk : colors.inkInverse}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

/** White pill with a hairline border — "Start solo", "Use a friend's code". */
export function SecondaryButton({
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
        styles.secondary,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <View style={styles.row}>
        {icon ? (
          <Ionicons
            name={icon}
            size={19}
            color={colors.inkMuted}
            style={styles.icon}
          />
        ) : null}
        <Text variant="button" color={disabled ? colors.field : colors.inkMuted}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

/** Underlined text link — "Already have an account?", "Skip". */
export function TextLink({
  label,
  onPress,
  color = colors.inkMuted,
  style,
}: {
  label: string;
  onPress?: () => void;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      style={({ pressed }) => [styles.link, pressed && styles.pressed, style]}
      hitSlop={10}
    >
      <Text
        variant="bodyStrong"
        color={color}
        style={{ textDecorationLine: 'underline' }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 58,
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
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
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
  link: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
});

export const buttonTextStyle = type.button;
