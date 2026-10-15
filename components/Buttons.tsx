import { Ionicons } from '@expo/vector-icons';
import { Button, Host } from '@expo/ui/swift-ui';
import {
  buttonBorderShape,
  buttonStyle,
  controlSize,
  disabled as disabledModifier,
  frame,
} from '@expo/ui/swift-ui/modifiers';
import {
  Pressable,
  StyleSheet,
  View,
  useColorScheme,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { quicksand, tint } from '@/lib/swiftUI';
import { sfSymbolFor } from '@/constants/symbols';
import { colors, radii, shadows, spacing, colorsFor } from '@/constants/theme';
import { NATIVE_HEADER } from './Screen';
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
export function PrimaryButton(props: BaseProps) {
  return NATIVE_HEADER ? <SystemButton {...props} /> : <DrawnButton {...props} />;
}

/**
 * On the iPhone, the system's own prominent button: SwiftUI's filled capsule
 * at its large size, with its own press and disabled states, in the system
 * blue with white type, light or dark — or, on the camera's black, the
 * tinted one in white, a soft white capsule with white type.
 */
function SystemButton({ label, onPress, disabled, icon, style, fullWidth = true, inverse }: BaseProps) {
  const symbol = icon ? sfSymbolFor(icon) : undefined;
  // SwiftUI takes plain colours, so they're picked for the appearance on show.
  const scheme = colorsFor(useColorScheme());
  return (
    <Host matchContents={{ vertical: true, horizontal: !fullWidth }} style={[fullWidth && styles.fullWidth, style]}>
      <Button
        label={label}
        systemImage={symbol}
        onPress={onPress}
        modifiers={[
          buttonStyle(inverse ? 'bordered' : 'borderedProminent'),
          buttonBorderShape('capsule'),
          controlSize('large'),
          // In the app's Quicksand rather than the system's own face.
          quicksand('body', 'semibold'),
          tint(inverse ? scheme.onMedia : scheme.systemAccent),
          ...(fullWidth ? [frame({ maxWidth: Number.MAX_SAFE_INTEGER })] : []),
          disabledModifier(!!disabled),
        ]}
      />
    </Host>
  );
}

function DrawnButton({
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
