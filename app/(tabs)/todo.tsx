import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';

import { AlertDialog } from '@/components/AlertDialog';
import { Card } from '@/components/Card';
import { DayRing, type DayRingState } from '@/components/DayRing';
import { DayScrubber } from '@/components/DayScrubber';
import { IconButton } from '@/components/IconButton';
import { PhotoLibrarySheet } from '@/components/PhotoLibrarySheet';
import { PopoverMenu } from '@/components/PopoverMenu';
import { ProfileLayout, profileAvatarSize } from '@/components/ProfileLayout';
import { StickyNote } from '@/components/StickyNote';
import { TaskRow } from '@/components/TaskRow';
import { spacing } from '@/constants/theme';
import { useApp, useDayProgress } from '@/hooks/useAppState';

export default function TodoScreen() {
  const router = useRouter();
  const {
    currentDay,
    totalDays,
    profile,
    toggleTask,
  } = useApp();

  // The scrubber can park on any day of the challenge; everything above and
  // below it — the note, the ring, the task list — follows that day, not
  // today. Days still ahead have no progress recorded, so they read as open.
  const [selectedDay, setSelectedDay] = useState(currentDay);
  useEffect(() => {
    setSelectedDay(currentDay);
  }, [currentDay]);

  const rows = useDayProgress(selectedDay);
  const future = selectedDay > currentDay;

  // The ring reads as a story ring: colour once the day is finished outright,
  // a plain grey band while there is proof on it but tasks still open, and a
  // lighter grey one on a day with no photos to open.
  const ringState: DayRingState = rows.length > 0 && rows.every((row) => row.done)
    ? 'full'
    : rows.some((row) => row.photo || row.photoSeed)
      ? 'partial'
      : 'none';

  const [menuOpen, setMenuOpen] = useState(false);
  const [restartOpen, setRestartOpen] = useState(false);
  // The task whose photo slot was tapped: the source dialog is shared, so it
  // needs to remember what it is picking for.
  const [photoFor, setPhotoFor] = useState<string | null>(null);
  /** The task the library sheet is open for, once a source has been chosen. */
  const [libraryFor, setLibraryFor] = useState<string | null>(null);

  /**
   * Held until the dialog has actually gone. Both destinations present
   * something of their own — a pushed page or a second modal — and starting
   * that while the dialog is still dismissing is what drops it on iOS.
   */
  const pending = useRef<(() => void) | null>(null);
  const runPending = () => {
    const next = pending.current;
    pending.current = null;
    next?.();
  };

  const openPicker = (source: 'camera' | 'library') => {
    const taskId = photoFor;
    if (!taskId) return;
    pending.current = () => {
      if (source === 'library') {
        setLibraryFor(taskId);
        return;
      }
      router.push({
        pathname: '/photo/camera',
        params: { taskId, day: String(selectedDay) },
      });
    };
    setPhotoFor(null);
    // A Modal reports its dismissal on iOS only; everywhere else there is
    // nothing to wait for, so it runs on the spot.
    if (Platform.OS !== 'ios') runPending();
  };

  return (
    <>
      <ProfileLayout
        tabBar
        padded={false}
        identity={
          <DayRing
            day={selectedDay}
            state={ringState}
            size={profileAvatarSize}
            avatarSeed={profile.avatarSeed}
            avatar={profile.avatar}
            onPress={() =>
              router.push({
                pathname: '/story',
                params: { day: String(selectedDay) },
              })
            }
            onDoublePressDay={() => setSelectedDay(currentDay)}
          />
        }
        action={
          <>
            <StickyNote
              value={selectedDay}
              size={62}
              colorIndex={0}
              tilt={-2}
              onPress={() => router.push('/sticker')}
            />
            <IconButton
              name="pencil"
              iconSize={21}
              onPress={() => setMenuOpen(true)}
              accessibilityLabel="Challenge options"
            />
          </>
        }
      >
        <DayScrubber
          day={selectedDay}
          totalDays={totalDays}
          onChange={setSelectedDay}
          style={styles.ticks}
        />

        <Card padded={false} style={styles.list}>
          {rows.map((row, i) => (
            <TaskRow
              key={row.task.id}
              label={row.task.label}
              done={row.done}
              time={row.time}
              photo={row.photo}
              photoSeed={row.photoSeed}
              onToggle={
                future ? undefined : () => toggleTask(row.task.id, selectedDay)
              }
              onPressPhoto={
                future ? undefined : () => setPhotoFor(row.task.id)
              }
              index={i}
              divider={i < rows.length - 1}
            />
          ))}
        </Card>
      </ProfileLayout>

      <PopoverMenu
        visible={menuOpen}
        onDismiss={() => setMenuOpen(false)}
        top={96}
        items={[
          {
            label: 'Restart Challenge',
            onPress: () => setRestartOpen(true),
          },
          {
            label: 'Change Challenge',
            onPress: () => router.push('/challenge/select'),
          },
        ]}
      />

      <AlertDialog
        visible={photoFor !== null}
        title="Today's Photo"
        message="Add a photo for this task (visible on your profile)."
        onDismiss={() => setPhotoFor(null)}
        onDismissed={runPending}
        actions={[
          { label: 'Camera', onPress: () => openPicker('camera') },
          { label: 'Library', onPress: () => openPicker('library') },
          { label: 'Cancel', onPress: () => setPhotoFor(null) },
        ]}
      />

      <PhotoLibrarySheet
        taskId={libraryFor}
        day={selectedDay}
        onDismiss={() => setLibraryFor(null)}
      />

      <AlertDialog
        visible={restartOpen}
        title="Restart Challenge"
        message="Are you sure? This will reset your challenge to day 1 starting today."
        onDismiss={() => setRestartOpen(false)}
        actions={[
          { label: 'Cancel', onPress: () => setRestartOpen(false) },
          {
            label: 'Restart',
            destructive: true,
            // Confirming only closes the dialog: the challenge is left where
            // it is until there is somewhere for a restart to lead.
            // `restartChallenge` is still on the context, unwired.
            onPress: () => setRestartOpen(false),
          },
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  ticks: {
    marginTop: spacing.lg,
  },
  list: {
    marginTop: spacing['2xl'],
    marginHorizontal: spacing.sm,
  },
});
