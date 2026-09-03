import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { AlertDialog } from '@/components/AlertDialog';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import { PhotoCollage } from '@/components/PhotoCollage';
import { PopoverMenu } from '@/components/PopoverMenu';
import { ProfileLayout } from '@/components/ProfileLayout';
import { TaskRow } from '@/components/TaskRow';
import { Text } from '@/components/Text';
import { colors, screenPadding, spacing } from '@/constants/theme';
import { shortLabel } from '@/lib/format';
import { useApp, useDayProgress } from '@/hooks/useAppState';

/**
 * Ceiling on the pile. The page has no fixed height to fit into the way the
 * card does, and left to fill the width a five-print day pushed the checklist
 * most of the way off the screen. The block is the day's face, not the whole
 * page.
 */
const PILE_MAX_HEIGHT = 300;

export default function TodoScreen() {
  const router = useRouter();
  const { currentDay, totalDays, undoTask } = useApp();

  // The page is today and nothing else: with the tick scrubber gone there is
  // no way to park on another day, so the collage and the list both read off
  // the current one.
  const rows = useDayProgress(currentDay);
  const done = rows.filter((row) => row.done).length;

  const [menuOpen, setMenuOpen] = useState(false);
  const [restartOpen, setRestartOpen] = useState(false);
  /** The done task whose photo was tapped, waiting on retake-or-undo. */
  const [doneFor, setDoneFor] = useState<string | null>(null);

  /**
   * Held until the dialog has actually gone: a retake pushes the camera, and
   * starting that while the dialog is still dismissing is what drops it on iOS.
   */
  const pending = useRef<(() => void) | null>(null);
  const runPending = () => {
    const next = pending.current;
    pending.current = null;
    next?.();
  };

  /**
   * The one way a task is ever ticked off. There is no library route and no
   * source dialog: the proof has to be photographed on the spot, so the photo
   * slot leads straight to the viewfinder.
   */
  const shoot = (taskId: string) => {
    router.push({
      pathname: '/photo/camera',
      params: { taskId, day: String(currentDay) },
    });
  };

  /**
   * What pressing a slot does, wherever it is pressed from. An empty one has
   * a single obvious meaning, so it opens the camera outright; a filled one
   * could mean either of two things, so it asks which.
   */
  const pressSlot = (row: (typeof rows)[number]) => () =>
    row.done ? setDoneFor(row.task.id) : shoot(row.task.id);

  /**
   * The grid is the day's record, not a way into the camera: only a photo that
   * exists answers to a tap, and it asks retake-or-undo the way it always did.
   * Photographing a task starts from its row below, which is the one place the
   * viewfinder is ever opened from.
   */
  const pressPhoto = (row: (typeof rows)[number]) =>
    row.done ? () => setDoneFor(row.task.id) : undefined;

  return (
    <>
      {/* No identity: the avatar belongs on the Profile tab, and this screen
          leads with the day itself. */}
      <ProfileLayout
        tabBar
        padded={false}
        // The day is a label, not a Playfair line, so it does not need the
        // full headline gap under the status bar to breathe.
        topGap={spacing.sm}
        leading={
          // The day is the page's title, and tapping it opens that day's
          // story — the way tapping the ring used to.
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Day ${currentDay}. Opens this day's story.`}
            onPress={() =>
              router.push({
                pathname: '/story',
                params: { day: String(currentDay) },
              })
            }
            style={({ pressed }) => (pressed ? styles.pressed : undefined)}
          >
            <Text variant="sectionTitle">{`Day ${currentDay}`}</Text>
            {/* The line the ticks used to carry: where today stands, and
                where today stands in the challenge. Without it the heading is
                a bare number and the page opens on nothing but pictures. */}
            <Text variant="label" color={colors.inkMuted}>
              {done === rows.length
                ? `All done · ${totalDays - currentDay} days left`
                : `${done} of ${rows.length} done · ${totalDays - currentDay} days left`}
            </Text>
          </Pressable>
        }
        action={
          <IconButton
            name="pencil"
            iconSize={21}
            onPress={() => setMenuOpen(true)}
            accessibilityLabel="Challenge options"
          />
        }
      >
        {/* The day as its pictures, laid out exactly as the day card lays
            them — the page you would post and the page you live in should not
            be two different pictures of the same day.

            So: only what has been photographed, no dashed gaps and no ticks.
            The block starts empty and grows a print at a time, which the
            progress line above already accounts for; holding a place for every
            task made the shape of the day out of things that were not there
            yet, and the scatter cannot carry gaps the way the die could. */}
        <PhotoCollage
          maxHeight={PILE_MAX_HEIGHT}
          style={styles.collage}
          cells={rows
            .filter((row) => row.photo || row.photoSeed)
            .map((row) => ({
              key: row.task.id,
              label: row.task.label,
              caption: shortLabel(row.task.label),
              photo: row.photo,
              seed: row.photoSeed,
              onPress: pressPhoto(row),
            }))}
        />

        <Card padded={false} style={styles.list}>
          {rows.map((row, i) => (
            <TaskRow
              key={row.task.id}
              label={row.task.label}
              done={row.done}
              time={row.time}
              onPressPhoto={pressSlot(row)}
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
        visible={doneFor !== null}
        title="Task Done"
        message="Take this one again, or undo it — undoing removes the photo too."
        onDismiss={() => setDoneFor(null)}
        onDismissed={runPending}
        actions={[
          {
            label: 'Retake Photo',
            onPress: () => {
              const taskId = doneFor;
              if (taskId) pending.current = () => shoot(taskId);
              setDoneFor(null);
              // A Modal reports its dismissal on iOS only; everywhere else
              // there is nothing to wait for, so the push runs on the spot.
              if (Platform.OS !== 'ios') runPending();
            },
          },
          {
            label: 'Undo Task',
            destructive: true,
            onPress: () => {
              if (doneFor) undoTask(doneFor, currentDay);
              setDoneFor(null);
            },
          },
          { label: 'Cancel', onPress: () => setDoneFor(null) },
        ]}
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
  pressed: {
    opacity: 0.75,
  },
  collage: {
    // Clear of the title above it.
    marginTop: spacing['2xl'],
    // The tiles hang off the page's own gutter.
    paddingHorizontal: screenPadding,
  },
  list: {
    marginTop: spacing['2xl'],
    // The page's own gutter, the same one the photo grid hangs off. The card
    // used to run wider than everything above it, which put the task text
    // closer to the edge of the screen than anything else on the app.
    marginHorizontal: screenPadding,
  },
});
