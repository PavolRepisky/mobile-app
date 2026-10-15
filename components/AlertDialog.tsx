import { useEffect, useRef } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { colors, radii, shadows, spacing, type } from '@/constants/theme';
import { BottomSheet } from './BottomSheet';
import { NATIVE_HEADER } from './Screen';
import { Text } from './Text';

export interface AlertAction {
  label: string;
  onPress: () => void;
  /** Red label — Delete, End Challenge. */
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
  /** Something to look at between the message and the actions — today's
   * post, opened from its line on Tasks. */
  children?: React.ReactNode;
}

/**
 * The iOS-style centred dialog used by "Undo Task", "End Challenge" and
 * "Update Username": title, message, optional field, optional content, then
 * pills. The
 * panel is a plain white card rather than the tab bar's liquid glass — an
 * alert reads a decision, not a surface floating over a photo.
 *
 * Two actions sit side by side; a third will not read as a pair, so past that
 * the pills stack full-width the way iOS does with its own alerts.
 */
export function AlertDialog(props: AlertDialogProps) {
  // The system alert holds a title, a line and at most one line of typing;
  // anything it can't hold — a list of rows, a bio's box — goes in a sheet.
  const fitsSystem = !props.children && !props.input?.multiline;
  if (!NATIVE_HEADER) return <DrawnAlert {...props} />;
  return fitsSystem ? <SystemAlert {...props} /> : <SheetAlert {...props} />;
}

/**
 * On the iPhone, the system's own alert, or its prompt when there is a line
 * to type. It is shown whenever the dialog is open with something new to
 * say, so a save that fails and changes the message puts the alert straight
 * back up with the reason; one that leaves it open with nothing new is
 * closed instead, since the system alert has already gone.
 */
function SystemAlert({ visible, title, message, onDismiss, actions, input }: AlertDialogProps) {
  // Read after a tap, once whatever the action set has rendered.
  const latest = useRef({ visible, message, actions, onDismiss });
  latest.current = { visible, message, actions, onDismiss };
  /** An action waiting for the typed text to land in the caller's state
   * before it runs, so it reads the new text rather than the old. */
  const pending = useRef<number | null>(null);

  const run = (index: number) => {
    const shown = latest.current.message;
    Promise.resolve(latest.current.actions[index]?.onPress()).finally(() =>
      setTimeout(() => {
        const now = latest.current;
        if (now.visible && now.message === shown) now.onDismiss();
      }),
    );
  };

  useEffect(() => {
    if (pending.current === null) return;
    const index = pending.current;
    pending.current = null;
    run(index);
    // Runs once the typed text has been committed, which is all it waits for.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input?.value]);

  useEffect(() => {
    if (!visible) return;
    const buttons = actions.map((action, index) => ({
      text: action.label,
      style: action.destructive
        ? ('destructive' as const)
        : !action.primary && actions.length > 1 && index === 0
          ? ('cancel' as const)
          : ('default' as const),
      isPreferred: action.primary && !action.destructive,
      onPress: (typed?: string) => {
        if (input && typed !== undefined && typed !== input.value) {
          pending.current = index;
          input.onChangeText(typed);
        } else {
          run(index);
        }
      },
    }));
    if (input) {
      Alert.prompt(title, message, buttons, 'plain-text', input.value);
    } else {
      Alert.alert(title, message, buttons);
    }
    // Shown once per opening, and again only if what it says changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, title, message]);

  return null;
}

function DrawnAlert({
  visible,
  title,
  message,
  onDismiss,
  actions,
  input,
  children,
}: AlertDialogProps) {
  // Only the dim behind the dialog fades in. The Modal's own fade took the
  // panel with it, so for its first few hundred milliseconds the card and its
  // words read washed out, see-through over the page. The dialog itself is
  // there at full strength from the first frame.
  const scrim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) return;
    scrim.setValue(0);
    Animated.timing(scrim, {
      toValue: 1,
      duration: SCRIM_FADE_MS,
      useNativeDriver: true,
    }).start();
  }, [visible, scrim]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.scrim, { opacity: scrim }]}
        />
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
              <DialogBody
                title={title}
                message={message}
                actions={actions}
                input={input}
              >
                {children}
              </DialogBody>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

/** What a dialog says and offers — shared by the drawn panel and, on the
 * iPhone, the system sheet a dialog too big for the system alert opens in. */
function DialogBody({
  title,
  message,
  actions,
  input,
  children,
}: Pick<AlertDialogProps, 'title' | 'message' | 'actions' | 'input' | 'children'>) {
  return (
    <>
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

    {children ? <View style={styles.content}>{children}</View> : null}

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
    </>
  );
}

/**
 * On the iPhone, a dialog the system alert can't hold — a list of rows, a
 * bio's box — rises as the system's own sheet instead, with the same words
 * and buttons in it.
 */
function SheetAlert({ visible, onDismiss, ...body }: AlertDialogProps) {
  return (
    <BottomSheet visible={visible} onDismiss={onDismiss}>
      <DialogBody {...body} />
    </BottomSheet>
  );
}

/** Quick enough that the dim lands with the dialog rather than after it. */
const SCRIM_FADE_MS = 160;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrim: {
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
  content: {
    marginTop: spacing.lg,
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
