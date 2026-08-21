import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { colors, fonts, radii, shadows, spacing } from '@/constants/theme';
import { Text } from './Text';

export interface AlertAction {
  label: string;
  onPress: () => void;
  /** Red label — Restart, Delete. */
  destructive?: boolean;
}

export interface AlertDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  onDismiss: () => void;
  actions: readonly AlertAction[];
  /** Renders a text field between the message and the actions. */
  input?: {
    value: string;
    onChangeText: (next: string) => void;
    placeholder?: string;
    autoFocus?: boolean;
  };
}

/**
 * The iOS-style centred dialog used by "Restart Challenge" and
 * "Update Username": title, message, optional field, then side-by-side pills.
 */
export function AlertDialog({
  visible,
  title,
  message,
  onDismiss,
  actions,
  input,
}: AlertDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Pressable
          accessibilityLabel="Dismiss"
          style={StyleSheet.absoluteFill}
          onPress={onDismiss}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.centre}
        >
          <View style={styles.dialog}>
            <Text variant="cardTitle">{title}</Text>

            {message ? (
              <Text variant="body" color={colors.inkSoft} style={styles.message}>
                {message}
              </Text>
            ) : null}

            {input ? (
              <TextInput
                value={input.value}
                onChangeText={input.onChangeText}
                placeholder={input.placeholder}
                placeholderTextColor={colors.inkMuted}
                autoFocus={input.autoFocus}
                style={styles.input}
              />
            ) : null}

            <View style={styles.actions}>
              {actions.map((action) => (
                <Pressable
                  key={action.label}
                  accessibilityRole="button"
                  onPress={action.onPress}
                  style={({ pressed }) => [
                    styles.action,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    variant="button"
                    color={action.destructive ? colors.destructive : colors.ink}
                  >
                    {action.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.scrimLight,
  },
  centre: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  dialog: {
    backgroundColor: '#F4F2EF',
    borderRadius: radii.xl,
    padding: spacing['2xl'],
    ...shadows.floating,
  },
  message: {
    marginTop: spacing.sm,
  },
  input: {
    marginTop: spacing.lg,
    height: 52,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: spacing.xl,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  action: {
    flex: 1,
    height: 52,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});

export default AlertDialog;
