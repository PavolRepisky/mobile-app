import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { AlertDialog } from '@/components/AlertDialog';
import { IconButton } from '@/components/IconButton';
import { PhotoSlot } from '@/components/PhotoSlot';
import { PopoverMenu } from '@/components/PopoverMenu';
import { ProfileLayout } from '@/components/ProfileLayout';
import { Text } from '@/components/Text';
import { colors, screenPadding, spacing } from '@/constants/theme';
import { useApp, useDayProgress } from '@/hooks/useAppState';

/**
 * Experiment: the day's tasks as a grid of photo tiles rather than a checklist
 * — two to a row, the label written under each tile rather than beside it.
 * Every task gets a cell whether or not it is photographed yet, so the grid
 * is the whole to-do list, not a record layered on top of one.
 */
const GRID_COLUMNS = 2;
const GRID_HEIGHT = 150;

export default function TodoScreen() {
  const router = useRouter();
  const { currentDay, totalDays, undoTask } = useApp();

  // The page is today and nothing else: with the tick scrubber gone there is
  // no way to park on another day, so the grid reads off the current one.
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

  // Cut into rows of `GRID_COLUMNS`, in task order — the grid is read the
  // same way the list it replaces was.
  const gridRows: (typeof rows)[number][][] = [];
  for (let i = 0; i < rows.length; i += GRID_COLUMNS) {
    gridRows.push(rows.slice(i, i + GRID_COLUMNS));
  }

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
        {/* Experiment: the list is gone, and every task is a tile in a grid
            instead, its own label written under it in place of the row it
            used to sit on. An unphotographed task is the same dashed camera
            invite its row's circle used to be; tapping it opens the
            viewfinder outright. A photographed one shows the print itself,
            ticked in the corner, and asks retake-or-undo the way the row's
            filled circle used to. */}
        <View style={styles.grid}>
          {gridRows.map((gridRow, r) => (
            <View key={r} style={[styles.gridRow, r > 0 && styles.gridGap]}>
              {gridRow.map((row) => (
                <View key={row.task.id} style={styles.cell}>
                  <PhotoSlot
                    width="100%"
                    height={GRID_HEIGHT}
                    photo={row.photo}
                    seed={row.photoSeed}
                    done={row.done}
                    emptyOutline={!row.done}
                    emptyIcon={row.done ? 'none' : 'camera'}
                    emptyTone="warm"
                    shadow={row.photo || row.photoSeed ? 'hard' : false}
                    onPress={pressSlot(row)}
                    accessibilityLabel={row.task.label}
                  />
                  <Text
                    variant="label"
                    color={colors.inkSlate}
                    center
                    numberOfLines={2}
                    style={styles.caption}
                  >
                    {row.task.label}
                  </Text>
                </View>
              ))}
              {/* A short last row keeps its tile the width of a full one's
                  rather than stretching it across the page. */}
              {Array.from(
                { length: GRID_COLUMNS - gridRow.length },
                (_, i) => (
                  <View key={`pad-${i}`} style={styles.cell} />
                ),
              )}
            </View>
          ))}
        </View>
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
  grid: {
    // Clear of the title above it.
    marginTop: spacing['2xl'],
    // The page's own gutter, the same one every other screen hangs off.
    paddingHorizontal: screenPadding,
  },
  gridRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  gridGap: {
    marginTop: spacing.xl,
  },
  cell: {
    flex: 1,
  },
  caption: {
    marginTop: spacing.sm,
  },
});
