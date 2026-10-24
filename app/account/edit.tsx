import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { usePreventRemove, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActionSheetIOS, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AlertDialog } from '@/components/AlertDialog';
import { Avatar } from '@/components/Avatar';
import { PhotoLibrarySheet } from '@/components/PhotoLibrarySheet';
import { PhotoViewer } from '@/components/PhotoViewer';
import { NATIVE_HEADER, ScreenScroll } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Text } from '@/components/Text';
import { colors, layout, radii, shadows, spacing, type } from '@/constants/theme';
import { useApp } from '@/hooks/useAppState';
import { updateProfile } from '@/lib/backend/api';

/** The server's own caps — the fields stop there rather than erroring. */
const NAME_MAX = 50;
const BIO_MAX = 120;
/** What the server takes as a username — said before sending, not after —
 * and its length cap, which the field stops at and counts. */
const HANDLE_MAX = 30;
const HANDLE_PATTERN = new RegExp(`^[a-z0-9_.]{3,${HANDLE_MAX}}$`);

/** The photo, big — the page is about you — with the pencil badge on its
 * corner saying a tap changes it. */
const AVATAR = 112;
const BADGE = 34;
const BADGE_GLYPH = 16;

/** A bio keeps its line breaks, but a run of blank lines would stretch the
 * profile's name block, so more than one break in a row folds to one. */
const tidyBio = (text: string) => text.replace(/[ \t]*\n\s*\n[\s]*/g, '\n');
/** The bio's box shows this many lines before it scrolls, so it reads as a
 * place for a few lines rather than one. */
const BIO_MIN_HEIGHT = type.copy.lineHeight * 3;

/**
 * Your photo, name, username and bio on one page, opened from Settings'
 * profile card and the profile's Edit profile button. The words are kept
 * only on Save — the close button leaves them as they were, asking first
 * if any were changed; the photo,
 * changed through its own menu, goes up straight away, as Contacts does.
 */
export default function EditProfileScreen() {
  const router = useRouter();
  const {
    profile,
    setName,
    setBio,
    setHandle,
    setAvatarPhoto,
    setAvatarSeed,
    avatarError,
    clearAvatarError,
  } = useApp();

  const [name, setDraftName] = useState(profile.name);
  // The @ is the app's to add, not the person's to type.
  const [handle, setDraftHandle] = useState(profile.handle.replace(/^@/, ''));
  const [bio, setDraftBio] = useState(profile.bio ?? '');
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const nextName = name.trim();
  const nextHandle = handle.trim().replace(/^@/, '').toLowerCase();
  const nextBio = tidyBio(bio).trim() || null;
  const changed = {
    ...(nextName && nextName !== profile.name ? { name: nextName } : {}),
    ...(nextHandle !== profile.handle.replace(/^@/, '') ? { handle: nextHandle } : {}),
    ...(nextBio !== (profile.bio ?? null) ? { bio: nextBio } : {}),
  };
  const dirty = Object.keys(changed).length > 0;

  // Leaving with changes typed and not saved asks first, as the iPhone's own
  // edit pages do — however the page is left: the cross, the edge swipe, or
  // Android's back. With nothing changed it just closes. Once saved or
  // discarded the page is let go, and the leaving that was held up goes on.
  const [discardOpen, setDiscardOpen] = useState(false);
  const [released, setReleased] = useState(false);
  const heldLeave = useRef<(() => void) | null>(null);
  usePreventRemove(dirty && !released, ({ repeat }) => {
    heldLeave.current = repeat;
    setDiscardOpen(true);
  });
  useEffect(() => {
    if (!released) return;
    if (heldLeave.current) heldLeave.current();
    else router.back();
  }, [released, router]);

  const save = async () => {
    if (!nextName) return setProblem('Your name can’t be empty.');
    if ('handle' in changed && !HANDLE_PATTERN.test(nextHandle)) {
      return setProblem('Usernames are 3 to 30 letters, numbers, dots or underscores.');
    }
    setSaving(true);
    setProblem(null);
    try {
      await updateProfile(changed);
      if (changed.name) setName(changed.name);
      if (changed.handle) setHandle(`@${changed.handle}`);
      if ('bio' in changed) setBio(changed.bio ?? null);
      heldLeave.current = null;
      setReleased(true);
    } catch (e) {
      setProblem(e instanceof Error ? e.message : 'That didn’t save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  // The photo: with one set, Edit opens it full-screen with Edit and Remove;
  // without one it goes straight to the library. Edit opens the library once
  // the viewer is gone — on iOS a sheet presented over a modal that is still
  // fading out never shows.
  const avatarSource = profile.avatar ?? profile.avatarSeed;
  const hasAvatar = Boolean(avatarSource);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const libraryAfterViewer = useRef(false);
  /**
   * On the iPhone, the photo works the way Contacts changes a picture: a
   * menu up from the bottom — choose one, take one, or take it away — and
   * the system's own picker or camera, cropping to a square on the way back.
   */
  const choosePhotoAction = () => {
    const options = ['Choose Photo', 'Take Photo', ...(hasAvatar ? ['Remove Photo'] : []), 'Cancel'];
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: options.length - 1,
        destructiveButtonIndex: hasAvatar ? 2 : undefined,
      },
      async (index) => {
        const picked = options[index];
        if (picked === 'Remove Photo') {
          setAvatarPhoto(null);
          setAvatarSeed(null);
          return;
        }
        if (picked !== 'Choose Photo' && picked !== 'Take Photo') return;
        const crop: ImagePicker.ImagePickerOptions = {
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        };
        if (picked === 'Take Photo') {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted) return;
        }
        const result =
          picked === 'Take Photo'
            ? await ImagePicker.launchCameraAsync(crop)
            : await ImagePicker.launchImageLibraryAsync(crop);
        const asset = result.canceled ? undefined : result.assets[0];
        if (asset) setAvatarPhoto({ uri: asset.uri });
      },
    );
  };
  const changePhoto = NATIVE_HEADER
    ? choosePhotoAction
    : () => (hasAvatar ? setPhotoOpen(true) : setLibraryOpen(true));

  const fields = [
    {
      key: 'name',
      label: 'Name',
      value: name,
      onChange: (text: string) => setDraftName(text.slice(0, NAME_MAX)),
      count: `${name.length}/${NAME_MAX}`,
      props: { maxLength: NAME_MAX, autoCapitalize: 'words' as const, textContentType: 'name' as const },
    },
    {
      key: 'handle',
      label: 'Username',
      value: handle,
      onChange: (text: string) => setDraftHandle(text.slice(0, HANDLE_MAX)),
      count: `${handle.length}/${HANDLE_MAX}`,
      props: {
        maxLength: HANDLE_MAX,
        autoCapitalize: 'none' as const,
        autoCorrect: false,
        textContentType: 'username' as const,
      },
    },
    {
      key: 'bio',
      label: 'Bio',
      value: bio,
      onChange: (text: string) => setDraftBio(text.slice(0, BIO_MAX)),
      count: `${bio.length}/${BIO_MAX}`,
      props: { maxLength: BIO_MAX, multiline: true, placeholder: 'Add a bio' },
    },
  ];

  return (
    <View style={styles.screenRoot}>
      {/* A page you leave by deciding: the cross drops the changes, Save —
          the bar's prominent button — keeps them, and only once there is
          something to keep. */}
      <ScreenScroll
        tone="alt"
        header={
          <ScreenHeader
            plainTitle="Edit profile"
            backIcon="close"
            actions={[
              { label: 'Save', prominent: true, disabled: !dirty || saving, onPress: save },
            ]}
          />
        }
      >
        <View style={styles.photo}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change photo"
            onPress={changePhoto}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <View style={[styles.avatar, shadows.hard]}>
              <Avatar source={avatarSource} size={AVATAR} />
            </View>
            <View style={[styles.badge, shadows.soft]}>
              <Ionicons name="pencil" size={BADGE_GLYPH} color={colors.ink} />
            </View>
          </Pressable>
        </View>

        {fields.map((field) => (
          <View key={field.key} style={styles.field}>
            {/* The label, and how much of the field is used where there's a
                cap on it — counted as you type, never told off after. */}
            <View style={styles.fieldHead}>
              <Text variant="meta" color={colors.inkMuted}>
                {field.label}
              </Text>
              {field.count ? (
                <Text variant="badge" color={colors.inkMuted}>
                  {field.count}
                </Text>
              ) : null}
            </View>
            <View style={styles.fieldBox}>
              <TextInput
                value={field.value}
                onChangeText={field.onChange}
                accessibilityLabel={field.label}
                placeholderTextColor={colors.inkMuted}
                style={[styles.input, field.props.multiline && styles.inputBio]}
                textAlignVertical={field.props.multiline ? 'top' : 'center'}
                {...field.props}
              />
            </View>
          </View>
        ))}

        <Text variant="badge" color={problem ? colors.destructive : colors.inkMuted} style={styles.note}>
          {problem ?? 'Your name and photo show on your posts. Anyone signed in can see your profile.'}
        </Text>
      </ScreenScroll>

      <PhotoViewer
        photos={avatarSource ? [avatarSource] : []}
        index={photoOpen ? 0 : null}
        onDismiss={() => setPhotoOpen(false)}
        onDismissed={() => {
          if (!libraryAfterViewer.current) return;
          libraryAfterViewer.current = false;
          setLibraryOpen(true);
        }}
        actions={[
          {
            key: 'edit',
            label: 'Edit',
            icon: 'pencil-outline',
            onPress: () => {
              setPhotoOpen(false);
              // iOS waits for the viewer to finish fading; nowhere else
              // loses a sheet presented straight away.
              if (Platform.OS === 'ios') libraryAfterViewer.current = true;
              else setLibraryOpen(true);
            },
          },
          {
            key: 'remove',
            label: 'Remove',
            icon: 'trash-outline',
            destructive: true,
            onPress: () => {
              setAvatarPhoto(null);
              setAvatarSeed(null);
              setPhotoOpen(false);
            },
          },
        ]}
      />

      <PhotoLibrarySheet
        visible={libraryOpen}
        onPick={setAvatarPhoto}
        onDismiss={() => setLibraryOpen(false)}
      />

      <AlertDialog
        visible={discardOpen}
        title="Discard Changes"
        message="Your name, username and bio go back to how they were."
        onDismiss={() => setDiscardOpen(false)}
        actions={[
          { label: 'Keep Editing', onPress: () => setDiscardOpen(false) },
          {
            label: 'Discard',
            destructive: true,
            primary: true,
            onPress: () => {
              setDiscardOpen(false);
              setReleased(true);
            },
          },
        ]}
      />

      {/* A new photo that didn't upload: the old one is already back, so
          this only has to say so. */}
      <AlertDialog
        visible={avatarError !== null}
        title="Not saved"
        message={avatarError ?? ''}
        onDismiss={clearAvatarError}
        actions={[{ label: 'OK', primary: true, onPress: clearAvatarError }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
  photo: {
    alignItems: 'center',
    marginBottom: layout.section,
  },
  // The disc behind the photo is the avatar's own shape, so the hard
  // shadow has something solid to cast from.
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },
  badge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: BADGE,
    height: BADGE,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  field: {
    marginBottom: layout.block,
  },
  // Nudged in off the box's corner, as Settings' group titles are.
  fieldHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: layout.stack,
    marginHorizontal: spacing.xs,
  },
  // A white box on the grey page, a step less round than Settings' cards:
  // a field is a line to type on, not a card, and the list's full corner
  // read as a bubble round one line of words.
  fieldBox: {
    paddingHorizontal: spacing.lg,
    paddingVertical: layout.inline,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  // `copy`, the level a field is set in — face, size and tracking only: a
  // line height on a single-line field shifts the text off centre.
  input: {
    fontFamily: type.copy.fontFamily,
    fontSize: type.copy.fontSize,
    letterSpacing: type.copy.letterSpacing,
    color: colors.ink,
    padding: 0,
  },
  // The bio wraps over several lines, so it takes the line height back and
  // opens three lines tall.
  inputBio: {
    lineHeight: type.copy.lineHeight,
    minHeight: BIO_MIN_HEIGHT,
  },
  note: {
    marginHorizontal: spacing.xs,
  },
  pressed: {
    opacity: 0.85,
  },
});
