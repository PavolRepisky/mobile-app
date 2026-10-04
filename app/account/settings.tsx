import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { AlertDialog } from '@/components/AlertDialog';
import { Avatar } from '@/components/Avatar';
import { PhotoLibrarySheet } from '@/components/PhotoLibrarySheet';
import { PhotoViewer } from '@/components/PhotoViewer';
import { ReminderRow } from '@/components/ReminderPill';
import { ScreenScroll } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Text } from '@/components/Text';
import { colors, layout, radii, spacing } from '@/constants/theme';
import { DEFAULT_TASK_REMINDER, useApp } from '@/hooks/useAppState';
import { updateProfile } from '@/lib/backend/api';
import { deleteAccount, signOut } from '@/lib/backend/auth';


const BIO_MAX = 120;

/** What the server takes as a username — said before sending, not after. */
const HANDLE_PATTERN = /^[a-z0-9_.]{3,30}$/;

/** The photo row's thumbnail — a row-height glance at the current photo, not
 * a second hero circle. */
const PHOTO_THUMB = 30;

/** The rounded square each row's glyph sits in, and the glyph inside it —
 * the square is what lines the labels up down the page, not the glyphs'
 * own uneven widths. */
const ROW_ICON_TILE = 32;
const ROW_ICON = 17;
const ROW_CHEVRON = 18;

/** A row's value stops here and ellipsises, so a long bio can't push the
 * label onto a second line. */
const ROW_VALUE_MAX = 150;

const APP_VERSION = Constants.expoConfig?.version ?? '1.0';

export default function SettingsScreen() {
  const {
    profile,
    setName,
    setBio,
    setHandle,
    setAvatarPhoto,
    setAvatarSeed,
    resetAll,
    leaveChallenge,
    inChallenge,
    tasks,
    reminders,
    setReminders,
  } = useApp();

  const reminderFor = (taskId: string) =>
    taskId in reminders.tasks ? reminders.tasks[taskId] : DEFAULT_TASK_REMINDER;
  const setReminderFor = (taskId: string, at: number | null) =>
    setReminders({ ...reminders, tasks: { ...reminders.tasks, [taskId]: at } });
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
  const [libraryOpen, setLibraryOpen] = useState(false);
  const libraryAfterViewer = useRef(false);

  const [nameOpen, setNameOpen] = useState(false);
  const [draftName, setDraftName] = useState(profile.name);
  const [handleOpen, setHandleOpen] = useState(false);
  const [draftHandle, setDraftHandle] = useState(profile.handle);
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
  const [remindersOpen, setRemindersOpen] = useState(false);
  /** The one reminder whose wheel is open in the window — a task's id, or
   * `lastCall`. One at a time, so the window never grows past the screen. */
  const [editingReminder, setEditingReminder] = useState<string | null>(null);
  const toggleReminder = (key: string) =>
    setEditingReminder((current) => (current === key ? null : key));
  const closeReminders = () => {
    setRemindersOpen(false);
    setEditingReminder(null);
  };

  return (
    <View style={styles.screenRoot}>
      {/* The one screen off the white: its groups are white cards, and on a
          white page they'd dissolve into it. The cooler off-white is what
          lets each group read as its own card. */}
      <ScreenScroll
        tone="alt"
        tabBar
        // The back arrow and the title in the fixed bar, in reach however
        // far down the settings go.
        header={<ScreenHeader plainTitle="Settings" />}
      >
        <Group title="Profile">
          <Row
            icon="camera-outline"
            label="Profile photo"
            accessory={<Avatar source={avatarSource} size={PHOTO_THUMB} />}
            onPress={() => (hasAvatar ? setPhotoOpen(true) : setLibraryOpen(true))}
          />
          <Row
            icon="person-outline"
            label="Name"
            value={profile.name}
            onPress={() => {
              setDraftName(profile.name);
              setSaveError(null);
              setNameOpen(true);
            }}
          />
          <Row
            icon="at-outline"
            label="Username"
            value={profile.handle}
            onPress={() => {
              setDraftHandle(profile.handle);
              setSaveError(null);
              setHandleOpen(true);
            }}
          />
          <Row
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
        </Group>

        {/* The challenge you're on: when it nudges you, folded to one row
            that opens its own window, then ending it — in red like Delete
            account, since it costs the whole run. Not in one, there's
            nothing to nudge about or end. */}
        {inChallenge ? (
          <Group title="Challenge">
            <Row
              icon="notifications-outline"
              label="Reminders"
              value={remindersOn === 0 ? 'Off' : `${remindersOn} on`}
              onPress={() => setRemindersOpen(true)}
            />
            <Row
              icon="flag-outline"
              label="End challenge"
              destructive
              onPress={() => {
                setSaveError(null);
                setEndOpen(true);
              }}
              last
            />
          </Group>
        ) : null}

        <Group title="About">
          <Row icon="shield-outline" label="Privacy Policy" onPress={() => {}} />
          <Row icon="document-outline" label="Terms of Service" onPress={() => {}} last />
        </Group>

        {/* Log out first and in ink: it's the one people come here for, and
            logging back in undoes it. Delete sits last and in red. */}
        <Group title="Account">
          <Row
            icon="log-out-outline"
            label="Log out"
            onPress={() => setLogoutOpen(true)}
          />
          <Row
            icon="trash-outline"
            label="Delete account"
            destructive
            onPress={() => {
              setSaveError(null);
              setDeleteOpen(true);
            }}
            last
          />
        </Group>

        <Text variant="metaBold" color={colors.inkMuted} style={styles.version}>
          Her 75 · version {APP_VERSION}
        </Text>
      </ScreenScroll>

      <AlertDialog
        visible={nameOpen}
        title="Update Username"
        message={saveError ?? 'Enter your new username'}
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
          // A bio is a line or two, not a page: a run of line breaks (typed
          // or pasted in) would stretch the identity block on the profile
          // page well past the avatar next to it, so breaks collapse to a
          // space as they're typed rather than surviving to render.
          onChangeText: (next) =>
            setDraftBio(next.replace(/\s*\n+\s*/g, ' ').slice(0, BIO_MAX)),
          autoFocus: true,
          multiline: true,
          maxLength: BIO_MAX,
        }}
        actions={[
          { label: 'Cancel', onPress: () => setBioOpen(false) },
          {
            label: 'Update',
            primary: true,
            onPress: async () => {
              const next = draftBio.trim() ? draftBio.trim() : null;
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

      {/* When each of today's tasks nudges you, and the one nudge that isn't a
          task's: the last call, which only comes while one is still missing.
          A pill opens its wheel in place, under its row, rather than a menu
          and a sheet stacked over this window. */}
      <AlertDialog
        visible={remindersOpen}
        title="Reminders"
        message="When each task nudges you, every day of the challenge."
        onDismiss={closeReminders}
        actions={[{ label: 'Done', primary: true, onPress: closeReminders }]}
      >
        {tasks.map((task) => (
          <ReminderRow
            key={task.id}
            label={task.label}
            value={reminderFor(task.id)}
            onChange={(at) => setReminderFor(task.id, at)}
            open={editingReminder === task.id}
            onToggle={() => toggleReminder(task.id)}
            divider
          />
        ))}
        <ReminderRow
          label="Last call"
          hint="Only if a task is still missing"
          value={reminders.lastCall}
          onChange={(at) => setReminders({ ...reminders, lastCall: at })}
          open={editingReminder === 'lastCall'}
          onToggle={() => toggleReminder('lastCall')}
        />
      </AlertDialog>

      <AlertDialog
        visible={endOpen}
        title="End Challenge"
        message={
          saveError ?? 'Are you sure you want to end this challenge? Your progress will be lost.'
        }
        onDismiss={() => setEndOpen(false)}
        actions={[
          { label: 'Cancel', onPress: () => setEndOpen(false) },
          {
            label: 'End Challenge',
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
    </View>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.group}>
      <Text variant="metaBold" color={colors.inkMuted} style={styles.groupTitle}>
        {title}
      </Text>
      <View style={styles.groupCard}>{children}</View>
    </View>
  );
}

function Row({
  label,
  value,
  accessory,
  onPress,
  destructive,
  icon,
  last,
}: {
  label: string;
  value?: string;
  /** Drawn where the value text would sit — the photo row's thumbnail. */
  accessory?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  last?: boolean;
}) {
  const ink = destructive ? colors.destructive : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !last && styles.rowDivider,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={ROW_ICON} color={ink} />
      </View>

      <Text variant="copy" color={ink} style={styles.rowLabel}>
        {label}
      </Text>

      {value ? (
        <Text
          variant="copy"
          color={colors.inkMuted}
          numberOfLines={1}
          style={styles.rowValue}
        >
          {value}
        </Text>
      ) : null}

      {accessory}

      {/* Faint: the whole row is the button; the chevron only says there's
          more behind it. */}
      <Ionicons name="chevron-forward" size={ROW_CHEVRON} color={colors.inkGhost} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
  group: {
    marginBottom: layout.section,
  },
  // Nudged in off the card's corner, so the title sits over the card rather
  // than hanging off its rounded edge.
  groupTitle: {
    marginBottom: layout.stack,
    marginLeft: spacing.xs,
  },
  groupCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.inline,
    paddingVertical: layout.inline,
    paddingHorizontal: spacing.lg,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    // The palette's fill grey rather than the warmer `divider`, so the
    // screen keeps to My Profile's colours.
    borderBottomColor: colors.surfaceSunken,
  },
  rowIcon: {
    width: ROW_ICON_TILE,
    height: ROW_ICON_TILE,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
  },
  rowValue: {
    maxWidth: ROW_VALUE_MAX,
  },
  version: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
