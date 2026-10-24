import Constants from 'expo-constants';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AlertDialog } from '@/components/AlertDialog';
import { Avatar } from '@/components/Avatar';
import { ScreenHeader } from '@/components/ScreenHeader';
import {
  SettingsGroup,
  SettingsList,
  SettingsProfileCard,
  SettingsRow,
} from '@/components/SettingsList';
import { DEFAULT_TASK_REMINDER, useApp } from '@/hooks/useAppState';
import { APPEARANCE_CHOICES, useAppearance } from '@/lib/appearance';
import { deleteAccount, signOut } from '@/lib/backend/auth';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0';

export default function SettingsScreen() {
  const router = useRouter();
  const appearance = useAppearance();
  const { profile, resetAll, leaveChallenge, inChallenge, tasks, reminders } = useApp();

  const reminderFor = (taskId: string) =>
    taskId in reminders.tasks ? reminders.tasks[taskId] : DEFAULT_TASK_REMINDER;
  // Every task's nudge and the last call, counting the ones not set to Never.
  const remindersOn =
    tasks.filter((task) => reminderFor(task.id) !== null).length +
    (reminders.lastCall !== null ? 1 : 0);

  // Each of the account rows is one tap from losing something, so each one
  // asks first. Separate flags rather than one union: the dialog fades out,
  // and a shared value would swap the copy mid-animation.
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  // Why the open dialog's action didn't go through — no connection — shown
  // in that dialog's own message, which stays open to try again. A second
  // dialog over it would be dropped on iOS while the first is still fading.
  const [saveError, setSaveError] = useState<string | null>(null);
  const failed = (e: unknown) =>
    setSaveError(e instanceof Error ? e.message : 'That didn’t go through. Try again.');

  return (
    <View style={styles.screenRoot}>
      {/* The one screen off the white: its groups are white cards, and on a
          white page they'd dissolve into it. */}
      <SettingsList
        // The back arrow and the title in the fixed bar, in reach however
        // far down the settings go.
        header={<ScreenHeader plainTitle="Settings" />}
      >
        {/* Who you are, first — the photo big, the name and username beside
            it — the way your Apple Account opens the Settings app. Your
            photo, name, username and bio are all changed on the page it
            opens. */}
        <SettingsGroup>
          <SettingsProfileCard
            avatar={(size) => <Avatar source={profile.avatar ?? profile.avatarSeed} size={size} />}
            name={profile.name}
            handle={`${profile.handle} · Edit profile`}
            onPress={() => router.push('/account/edit' as Href)}
          />
        </SettingsGroup>

        {/* How the app behaves for you: when the era you're on nudges you,
            how it looks, and ending the era — in red, since it costs the
            run. The era's rows only while you're on one. */}
        <SettingsGroup title="App">
          {inChallenge ? (
            <SettingsRow
              icon="notifications-outline"
              label="Reminders"
              value={remindersOn === 0 ? 'Off' : `${remindersOn} on`}
              navigates
              onPress={() => router.push('/account/reminders' as Href)}
            />
          ) : null}
          <SettingsRow
            icon="moon-outline"
            label="Theme"
            value={APPEARANCE_CHOICES.find((c) => c.key === appearance)?.label}
            navigates
            onPress={() => router.push('/account/theme' as Href)}
            last={!inChallenge}
          />
          {inChallenge ? (
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
          ) : null}
        </SettingsGroup>

        {/* TODO before release: both open nothing yet. The App Store needs
            a working privacy policy link — see the project board. */}
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
          footer={`Selfera · version ${APP_VERSION}`}
          footerCentered
        >
          <SettingsRow
            icon="log-out-outline"
            label="Log out"
            onPress={() => {
              setSaveError(null);
              setLogoutOpen(true);
            }}
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
            // Marked like Log Out and End Era: every confirmation's way
            // forward reads the same.
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
          saveError ??
          'Are you sure you want to end this era? Your days so far stay on your profile, but once it has started you can’t rejoin.'
        }
        onDismiss={() => setEndOpen(false)}
        actions={[
          { label: 'Cancel', onPress: () => setEndOpen(false) },
          {
            label: 'End Era',
            destructive: true,
            primary: true,
            // Leaves the round; Tasks then points to Discover, since there's
            // no run left to show, and the run's days move to the profile's
            // past eras.
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
        title="Log Out"
        message={saveError ?? 'Are you sure you want to log out?'}
        onDismiss={() => setLogoutOpen(false)}
        actions={[
          { label: 'Cancel', onPress: () => setLogoutOpen(false) },
          {
            label: 'Log Out',
            destructive: true,
            primary: true,
            // Closed only once the session has really gone: a failure stays
            // in the dialog to try again, as every other one here does.
            onPress: async () => {
              try {
                await signOut();
                setLogoutOpen(false);
                resetAll();
              } catch (e) {
                failed(e);
              }
            },
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
});
