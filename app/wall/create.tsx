import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { IconButton } from '@/components/IconButton';
import { PhotoLibrarySheet } from '@/components/PhotoLibrarySheet';
import { ScreenScroll } from '@/components/Screen';
import { Text } from '@/components/Text';
import {
  bodyTracking,
  colors,
  fonts,
  radii,
  spacing,
  type as typeScale,
} from '@/constants/theme';
import { useApp, type TaskPhoto } from '@/hooks/useAppState';

const TITLE_LIMIT = 100;

/**
 * Writing up a photo pinned to a wall collection: the shot, a name for it, and
 * optionally a note and a link. The same screen edits one that already exists,
 * reached with its id in `edit` — the only differences are where the fields
 * start and which action the tick runs.
 *
 * A new pin's photo arrives through `pinDraft` on the app state rather than
 * through route params — a picked image is a bundled module as often as it is
 * a URI, and neither survives being turned into a string and back.
 */
export default function CreatePinScreen() {
  const router = useRouter();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const {
    pinDraft,
    setPinDraftPhoto,
    addWallPin,
    updateWallPin,
    clearPinDraft,
    wall,
  } = useApp();

  const existing = edit
    ? wall.flatMap((board) => board.pins).find((pin) => pin.id === edit)
    : undefined;

  const [title, setTitle] = useState(existing?.title ?? '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [link, setLink] = useState(existing?.link ?? '');
  const [pickerOpen, setPickerOpen] = useState(false);
  /**
   * The draft's photo, mirrored here so the screen still has something to draw
   * on its way out: committing the pin clears the draft, and the pop that
   * follows is not instant. Only ever replaced, never cleared, which is what
   * keeps the guard below from firing a second `back` under the first.
   */
  const [photo, setPhoto] = useState<TaskPhoto | null>(
    existing?.photo ?? pinDraft?.photo ?? null,
  );

  // Nothing to write up — a reload, or the screen reached on its own. Leaving
  // rather than rendering an empty frame.
  useEffect(() => {
    if (!photo) router.back();
  }, [photo, router]);

  if (!photo) return null;

  const canSave = title.trim().length > 0;

  const save = () => {
    const written = {
      title: title.trim(),
      note: note.trim() || undefined,
      link: link.trim() || undefined,
    };
    if (existing) updateWallPin(existing.id, { ...written, photo });
    else addWallPin(written);
    router.back();
  };

  const leave = () => {
    clearPinDraft();
    router.back();
  };

  return (
    <ScreenScroll
      tone="plain"
      // The form is taller than the screen once the keyboard is up, and the
      // Description and Link boxes are the two that end up under it. The
      // scroller takes the keyboard as an inset so they can be scrolled clear
      // of it, and iOS brings the focused field up on its own.
      automaticallyAdjustKeyboardInsets
      // Without this the first tap on the tick only closes the keyboard, and
      // saving a pin takes two.
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    >
      <View style={styles.topBar}>
        <IconButton
          name="chevron-back"
          onPress={leave}
          accessibilityLabel="Back"
        />
        <Text variant="cardTitle" style={styles.heading}>
          {existing ? 'Edit Pin' : 'Create Pin'}
        </Text>
        <IconButton
          name="checkmark"
          onPress={canSave ? save : undefined}
          accessibilityLabel="Save pin"
          style={!canSave ? styles.disabled : undefined}
        />
      </View>

      <View style={styles.photoWrap}>
        <Image
          source={photo}
          contentFit="cover"
          transition={200}
          style={styles.photo}
        />
        {/* Solid rather than the usual lens: it sits on the photograph, which
            is too busy for a piece of glass to read against. */}
        <IconButton
          name="pencil"
          iconSize={20}
          background={colors.ink}
          color={colors.inkInverse}
          onPress={() => setPickerOpen(true)}
          accessibilityLabel="Change photo"
          style={styles.editPhoto}
        />
      </View>

      <Field label="Title">
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Give your card a name"
          placeholderTextColor={colors.inkMuted}
          maxLength={TITLE_LIMIT}
          style={styles.input}
        />
      </Field>
      <Text variant="caption" color={colors.inkMuted} style={styles.counter}>
        {`${title.length}/${TITLE_LIMIT}`}
      </Text>

      <Field label="Description" style={styles.tall}>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Add a note"
          placeholderTextColor={colors.inkMuted}
          multiline
          style={[styles.input, styles.multiline]}
        />
      </Field>

      <Field label="Link" style={styles.spaced}>
        <TextInput
          value={link}
          onChangeText={setLink}
          placeholder="Paste a link (optional)"
          placeholderTextColor={colors.inkMuted}
          autoCapitalize="none"
          keyboardType="url"
          style={styles.input}
        />
      </Field>

      <PhotoLibrarySheet
        visible={pickerOpen}
        onPick={(next) => {
          setPhoto(next);
          setPinDraftPhoto(next);
        }}
        onDismiss={() => setPickerOpen(false)}
      />
    </ScreenScroll>
  );
}

/** One outlined box: its name in the heavy cut, the field under it. */
function Field({
  label,
  children,
  style,
}: {
  label: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.field, style]}>
      <Text variant="body" style={styles.fieldLabel}>
        {label}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heading: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.bodyBold,
    fontSize: 21,
  },
  disabled: {
    opacity: 0.35,
  },
  photoWrap: {
    alignSelf: 'center',
    width: 184,
    marginTop: spacing['2xl'],
  },
  photo: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSunken,
  },
  // Lapped over the corner of the photo rather than tucked inside it, the way
  // the "Add photo" bubble sits on the profile circle.
  editPhoto: {
    position: 'absolute',
    top: spacing.md,
    right: -spacing.sm,
  },
  field: {
    marginTop: spacing['2xl'],
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  fieldLabel: {
    fontFamily: fonts.bodyBold,
  },
  spaced: {
    marginBottom: spacing['4xl'],
  },
  tall: {
    minHeight: 148,
  },
  input: {
    marginTop: spacing.xs,
    // A step up from `body`: the placeholders are most of what this screen
    // shows before anything is typed, and at the body cut they read as faint
    // rather than as prompts. The typed text follows them up.
    ...typeScale.bodySemi,
    letterSpacing: bodyTracking,
    color: colors.ink,
    padding: 0,
  },
  multiline: {
    flex: 1,
    textAlignVertical: 'top',
  },
  counter: {
    marginTop: spacing.sm,
    marginLeft: spacing.xs,
  },
});
