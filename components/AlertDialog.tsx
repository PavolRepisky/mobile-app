import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { colors, radii, shadows, spacing, type } from '@/constants/theme';
import { Text } from './Text';

export interface AlertAction {
  label: string;
  onPress: () => void;
  /** Red label — Restart, Delete. */
  destructive?: boolean;
  /**
   * The action the dialog is asking for — Update, Delete, Log out — set as a
   * solid black pill with white type beside the grey chip of Cancel, so the
   * way forward is the thing the eye lands on. Takes precedence over
   * `destructive`: red type on the black pill would all but disappear.
   */
  primary?: boolean;
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
    /** A taller, top-aligned field for a sentence or two — a bio, not a name. */
    multiline?: boolean;
    /** Shown as a counter under the field when `multiline` is set. */
    maxLength?: number;
  };
}

/**
 * The iOS-style centred dialog used by "Today's Photo", "Restart Challenge"
 * and "Update Username": title, message, optional field, then pills. The
 * panel is a plain white card rather than the tab bar's liquid glass — an
 * alert reads a decision, not a surface floating over a photo.
 *
 * Two actions sit side by side; a third will not read as a pair, so past that
 * the pills stack full-width the way iOS does with its own alerts.
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
          <View style={[styles.panel, shadows.floating]}>
            <View style={styles.dialog}>
              <Text variant="sectionHeading">
                {title}
              </Text>

              {message ? (
                <Text
                  variant="copy"
                  color={colors.inkMuted}
                  style={styles.message}
                >
                  {message}
                </Text>
              ) : null}

              {input ? (
                <>
                  <TextInput
                    value={input.value}
                    onChangeText={input.onChangeText}
                    placeholder={input.placeholder}
                    placeholderTextColor={colors.inkMuted}
                    autoFocus={input.autoFocus}
                    multiline={input.multiline}
                    maxLength={input.maxLength}
                    style={[styles.input, input.multiline && styles.inputMultiline]}
                  />

                  {input.multiline && input.maxLength ? (
                    <Text
                      variant="label"
                      color={colors.inkMuted}
                      style={styles.counter}
                    >
                      {input.value.length}/{input.maxLength}
                    </Text>
                  ) : null}
                </>
              ) : null}

              <View
                style={[
                  styles.actions,
                  actions.length > 2 && styles.actionsStacked,
                ]}
              >
                {actions.map((action) => (
                  <Pressable
                    key={action.label}
                    accessibilityRole="button"
                    onPress={action.onPress}
                    style={({ pressed }) => [
                      styles.action,
                      action.primary && styles.actionPrimary,
                      actions.length > 2
                        ? styles.actionStacked
                        : styles.actionRow,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      variant="button"
                      color={
                        action.primary
                          ? colors.inkInverse
                          : action.destructive
                            ? colors.destructive
                            : colors.ink
                      }
                    >
                      {action.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
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
  panel: {
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  dialog: {
    padding: spacing['2xl'],
  },
  message: {
    marginTop: spacing.sm,
  },
  input: {
    marginTop: spacing.lg,
    height: 52,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceSunken,
    paddingHorizontal: spacing.xl,
    // What you type reads at the hierarchy's `copy` level, the same as the
    // message above it.
    ...type.copy,
    color: colors.ink,
  },
  // A pill reads as a single line; a paragraph needs a box it can wrap
  // inside, top-aligned the way a sentence starts rather than centred like a
  // one-line field.
  inputMultiline: {
    height: 140,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    textAlignVertical: 'top',
  },
  counter: {
    marginTop: spacing.sm,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  actionsStacked: {
    flexDirection: 'column',
  },
  action: {
    height: 52,
    borderRadius: radii.pill,
    // Reads as a frosted pill on the glass rather than a grey chip on a card,
    // which is what the same wash does on the tab bar's active tab.
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPrimary: {
    backgroundColor: colors.ink,
  },
  /** Side by side: the pair splits the dialog's width between them. */
  actionRow: {
    flex: 1,
  },
  /**
   * Stacked, the main axis is the one the row was splitting — and `flex: 1`
   * there resolves the basis to zero inside a dialog that sizes to its own
   * content, so the pills measure to nothing and the alert renders as a title
   * over empty space. Full width comes from stretching instead.
   */
  actionStacked: {
    alignSelf: 'stretch',
  },
  pressed: {
    opacity: 0.75,
  },
});

export default AlertDialog;
