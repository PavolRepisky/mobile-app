import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, type Href } from 'expo-router';
import { useRef, useState } from 'react';
import { ActionSheetIOS, Platform, StyleSheet, View } from 'react-native';

import { AlertDialog } from '@/components/AlertDialog';
import { Avatar } from '@/components/Avatar';
import { PhotoLibrarySheet } from '@/components/PhotoLibrarySheet';
import { PhotoViewer } from '@/components/PhotoViewer';
import { NATIVE_HEADER } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import {
  SettingsGroup,
  SettingsList,
  SettingsProfileCard,
  SettingsRow,
} from '@/components/SettingsList';
import { DEFAULT_TASK_REMINDER, useApp } from '@/hooks/useAppState';
import { APPEARANCE_CHOICES, useAppearance } from '@/lib/appearance';
import { updateProfile } from '@/lib/backend/api';
import { deleteAccount, signOut } from '@/lib/backend/auth';

const BIO_MAX = 120;

/** What the server takes as a username — said before sending, not after. */
const HANDLE_PATTERN = /^[a-z0-9_.]{3,30}$/;

const APP_VERSION = Constants.expoConfig?.version ?? '1.0';

export default function SettingsScreen() {
  const router = useRouter();
  const appearance = useAppearance();
  const {
    profile,
    setName,
    setBio,
    setHandle,
    setAvatarPhoto,
    setAvatarSeed,
    resetAll,
    leaveChallenge,
    avatarError,
    clearAvatarError,
    inChallenge,
    tasks,
    reminders,
  } = useApp();

  const reminderFor = (taskId: string) =>
    taskId in reminders.tasks ? reminders.tasks[taskId] : DEFAULT_TASK_REMINDER;
  // Every task's nudge and the last call, counting the ones not set to Never.
  const remindersOn =
    tasks.filter((task) => reminderFor(task.id) !== null).length +
    (reminders.lastCall !== null ? 1 : 0);

  // Changing the photo lives here rather than on the profile, where a tap on
  // the photo plays today's story instead. With a photo set, the row opens it
  // full-screen with Edit and Remove; without one it goes straight to the
  // library. Edit opens the library once the viewer is gone — on iOS a sheet
  // presented over a modal that is still fading out never shows.
  const avatarSource = profile.avatar ?? profile.avatarSeed;
  const hasAvatar = Boolean(avatarSource);
  const [photoOpen, setPhotoOpen] = useState(false);
  /**
   * On the iPhone, the photo row works the way Contacts changes a picture: a
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
  const [libraryOpen, setLibraryOpen] = useState(false);
  const libraryAfterViewer = useRef(false);

  const [nameOpen, setNameOpen] = useState(false);
  const [draftName, setDraftName] = useState(profile.name);
  const [handleOpen, setHandleOpen] = useState(false);
  const [draftHandle, setDraftHandle] = useState(profile.handle.replace(/^@/, ''));
  const [bioOpen, setBioOpen] = useState(false);
  const [draftBio, setDraftBio] = useState(profile.bio ?? '');
  // Both account rows are one tap from wiping everything, so each one asks
  // first. Separate flags rather than one union: the dialog fades out, and a
  // shared value would swap the copy mid-animation.
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  // Why the open dialog's change didn't go through — a taken username, no
  // connection — shown in that dialog's own message, which stays open to try
  // again. A second dialog over it would be dropped on iOS while the first
  // is still fading out.
  const [saveError, setSaveError] = useState<string | null>(null);
  const failed = (e: unknown) =>
    setSaveError(e instanceof Error ? e.message : 'That didn’t save. Try again.');
  const [endOpen, setEndOpen] = useState(false);

  return (
    <View style={styles.screenRoot}>
      {/* The one screen off the white: its groups are white cards, and on a
          white page they'd dissolve into it. The cooler off-white is what
          lets each group read as its own card. */}
      <SettingsList
        // The back arrow and the title in the fixed bar, in reach however
        // far down the settings go.
        header={<ScreenHeader plainTitle="Settings" />}
      >
        {/* Who you are, first — the photo big, the name and username beside
            it — the way your Apple Account opens the Settings app. Tapping
            it changes the photo. */}
        <SettingsGroup>
          <SettingsProfileCard
            avatar={(size) => <Avatar source={avatarSource} size={size} />}
            name={profile.name}
            handle={profile.handle}
            onPress={
              NATIVE_HEADER
                ? choosePhotoAction
                : () => (hasAvatar ? setPhotoOpen(true) : setLibraryOpen(true))
            }
          />
        </SettingsGroup>

        <SettingsGroup title="Profile">
          {/* Each value is changed on the spot, in a dialog over the page —
              no chevron, since nothing opens. */}
          <SettingsRow
            icon="person-outline"
            label="Name"
            value={profile.name}
            onPress={() => {
              setDraftName(profile.name);
              setSaveError(null);
              setNameOpen(true);
            }}
          />
          <SettingsRow
            icon="at-outline"
            label="Username"
            value={profile.handle}
            onPress={() => {
              // The @ is the app's to add, not the person's to type.
              setDraftHandle(profile.handle.replace(/^@/, ''));
              setSaveError(null);
              setHandleOpen(true);
            }}
          />
          <SettingsRow
            icon="reorder-three-outline"
            label="Bio"
            value={profile.bio ?? 'Add a bio'}
            onPress={() => {
              setDraftBio(profile.bio ?? '');
              setSaveError(null);
              setBioOpen(true);
            }}
            last
          />
        </SettingsGroup>

        {/* The challenge you're on: when it nudges you, folded to one row
            that opens its own window, then ending it — in red like Delete
            account, since it costs the whole run. Not in one, there's
            nothing to nudge about or end. */}
        {inChallenge ? (
          <SettingsGroup title="Era">
            <SettingsRow
              icon="notifications-outline"
              label="Reminders"
              value={remindersOn === 0 ? 'Off' : `${remindersOn} on`}
              navigates
              onPress={() => router.push('/account/reminders' as Href)}
            />
            <SettingsRow
              icon="flag-outline"
              label="End era"
              destructive
              onPress={() => {
                setSaveError(null);
                setEndOpen(true);
              }}
              last
            />
          </SettingsGroup>
        ) : null}

        <SettingsGroup title="Appearance">
          <SettingsRow
            icon="contrast-outline"
            label="Theme"
            value={APPEARANCE_CHOICES.find((c) => c.key === appearance)?.label}
            navigates
            onPress={() => router.push('/account/theme' as Href)}
            last
          />
        </SettingsGroup>

        <SettingsGroup title="About">
          <SettingsRow icon="shield-outline" label="Privacy Policy" external onPress={() => {}} />
          <SettingsRow
            icon="document-outline"
            label="Terms of Service"
            external
            onPress={() => {}}
            last
          />
        </SettingsGroup>

        {/* Log out first and in ink: it's the one people come here for, and
            logging back in undoes it. Delete sits last and in red. */}
        <SettingsGroup
          title="Account"
          // The version as the last group's small print, centred under it.
          footer={`SelfEra · version ${APP_VERSION}`}
          footerCentered
        >
          <SettingsRow
            icon="log-out-outline"
            label="Log out"
            onPress={() => setLogoutOpen(true)}
          />
          <SettingsRow
            icon="trash-outline"
            label="Delete account"
            destructive
            onPress={() => {
              setSaveError(null);
              setDeleteOpen(true);
            }}
            last
          />
        </SettingsGroup>

      </SettingsList>

      <AlertDialog
        visible={nameOpen}
        title="Update Name"
        message={saveError ?? 'How you show up to friends and on your posts'}
        onDismiss={() => setNameOpen(false)}
        input={{
          value: draftName,
          onChangeText: setDraftName,
          autoFocus: true,
        }}
        actions={[
          { label: 'Cancel', onPress: () => setNameOpen(false) },
          {
            label: 'Update',
            primary: true,
            onPress: async () => {
              const next = draftName.trim();
              if (!next) return setNameOpen(false);
              try {
                await updateProfile({ name: next });
                setName(next);
                setNameOpen(false);
              } catch (e) {
                failed(e);
              }
            },
          },
        ]}
      />

      <AlertDialog
        visible={handleOpen}
        title="Update Username"
        message={saveError ?? 'Enter your new username'}
        onDismiss={() => setHandleOpen(false)}
        input={{
          value: draftHandle,
          onChangeText: setDraftHandle,
          autoFocus: true,
        }}
        actions={[
          { label: 'Cancel', onPress: () => setHandleOpen(false) },
          {
            label: 'Update',
            primary: true,
            onPress: async () => {
              const next = draftHandle.trim().replace(/^@/, '').toLowerCase();
              if (!next) return setHandleOpen(false);
              if (!HANDLE_PATTERN.test(next)) {
                return setSaveError('3 to 30 letters, numbers, dots or underscores.');
              }
              try {
                await updateProfile({ handle: next });
                setHandle(`@${next}`);
                setHandleOpen(false);
              } catch (e) {
                failed(e);
              }
            },
          },
        ]}
      />

      <AlertDialog
        visible={bioOpen}
        title="Update Bio"
        message={saveError ?? 'Tell friends a little about yourself'}
        onDismiss={() => setBioOpen(false)}
        input={{
          value: draftBio,
          // One line, so it opens in the same system prompt as the name and
          // username. A bio is a line or two, not a page — a run of line
          // breaks would stretch the name block on the profile well past the
          // avatar beside it — so any pasted in collapse to a space.
          onChangeText: (next) =>
            setDraftBio(next.replace(/\s*\n+\s*/g, ' ').slice(0, BIO_MAX)),
          autoFocus: true,
          maxLength: BIO_MAX,
        }}
        actions={[
          { label: 'Cancel', onPress: () => setBioOpen(false) },
          {
            label: 'Update',
            primary: true,
            onPress: async () => {
              const trimmed = draftBio.replace(/\s*\n+\s*/g, ' ').trim().slice(0, BIO_MAX);
              const next = trimmed ? trimmed : null;
              try {
                await updateProfile({ bio: next });
                setBio(next);
                setBioOpen(false);
              } catch (e) {
                failed(e);
              }
            },
          },
        ]}
      />

      <AlertDialog
        visible={deleteOpen}
        title="Delete Account"
        message={
          saveError ??
          'Are you sure you want to delete your account? This action is irreversible.'
        }
        onDismiss={() => setDeleteOpen(false)}
        actions={[
          { label: 'Cancel', onPress: () => setDeleteOpen(false) },
          {
            label: 'Delete',
            // The black pill, like Log out and End Challenge: every
            // confirmation's way forward reads the same.
            destructive: true,
            primary: true,
            onPress: async () => {
              try {
                // The session ends with the account, which takes the app
                // back to the sign-in page on its own.
                await deleteAccount();
                setDeleteOpen(false);
                resetAll();
              } catch (e) {
                failed(e);
              }
            },
          },
        ]}
      />

      <AlertDialog
        visible={endOpen}
        title="End Era"
        message={
          saveError ?? 'Are you sure you want to end this era? Your progress will be lost.'
        }
        onDismiss={() => setEndOpen(false)}
        actions={[
          { label: 'Cancel', onPress: () => setEndOpen(false) },
          {
            label: 'End Era',
            destructive: true,
            primary: true,
            // Leaves the round for good; Tasks then points to the Challenges
            // tab, since there's no run left to show.
            onPress: async () => {
              try {
                await leaveChallenge();
                setEndOpen(false);
              } catch (e) {
                failed(e);
              }
            },
          },
        ]}
      />

      <AlertDialog
        visible={logoutOpen}
        title="Log out"
        message="Are you sure you want to log out?"
        onDismiss={() => setLogoutOpen(false)}
        actions={[
          { label: 'Cancel', onPress: () => setLogoutOpen(false) },
          {
            label: 'Log out',
            destructive: true,
            primary: true,
            onPress: async () => {
              setLogoutOpen(false);
              await signOut();
              resetAll();
            },
          },
        ]}
      />

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
            // The outline cut, like the profile header's own glyphs.
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

      {/* A new photo that didn't upload: the old one is already back, so
          this only has to say so. It comes once the upload has failed, well
          after the library sheet has gone, so it never stacks on it. */}
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
});
