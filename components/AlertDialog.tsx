import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { bodyTracking, colors, fonts, radii, shadows, spacing } from '@/constants/theme';
import { GlassSurface } from './GlassSurface';
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
  /**
   * Fired once the dialog has finished animating away, for callers that open
   * something of their own next: presenting on top of a modal that is still
   * dismissing loses the new screen on iOS. iOS only, which is also the only
   * platform that presents anything to lose.
   */
  onDismissed?: () => void;
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
 * and "Update Username": title, message, optional field, then pills. The panel
 * is the same liquid-glass lens the tab bar is built from, so the screen it
 * interrupts stays legible, blurred, underneath it.
 *
 * Two actions sit side by side; a third will not read as a pair, so past that
 * the pills stack full-width the way iOS does with its own alerts.
 */
export function AlertDialog({
  visible,
  title,
  message,
  onDismiss,
  onDismissed,
  actions,
  input,
}: AlertDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      onDismiss={onDismissed}
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
          {/* The lens clips its children, and on iOS a view cannot both clip
              and cast a shadow, so the drop lives out here. */}
          <View style={[styles.panel, shadows.floating]}>
            <GlassSurface radius={radii.xl} shadow={false}>
              <View style={styles.dialog}>
                <Text variant="cardTitle" style={styles.title}>
                  {title}
                </Text>

                {message ? (
                  <Text
                    variant="body"
                    color={colors.inkSoft}
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
                        actions.length > 2
                          ? styles.actionStacked
                          : styles.actionRow,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        variant="button"
                        color={
                          action.destructive ? colors.destructive : colors.ink
                        }
                      >
                        {action.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </GlassSurface>
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
    // Left unfilled: a background here would sit behind the lens, and the
    // blur would sample it instead of the screen the dialog is covering.
  },
  dialog: {
    padding: spacing['2xl'],
  },
  /**
   * A step past the card titles this variant is otherwise used for: the alert
   * has nothing else on it to carry the weight, so the heading has to.
   */
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: 19,
    lineHeight: 25,
  },
  message: {
    marginTop: spacing.sm,
  },
  input: {
    marginTop: spacing.lg,
    height: 52,
    borderRadius: radii.pill,
    backgroundColor: colors.frostField,
    paddingHorizontal: spacing.xl,
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: bodyTracking,
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
    backgroundColor: colors.frostAction,
    alignItems: 'center',
    justifyContent: 'center',
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
