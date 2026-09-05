import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type LayoutRectangle,
} from 'react-native';

import { AlertDialog } from '@/components/AlertDialog';
import { IconButton } from '@/components/IconButton';
import { PhotoCollage } from '@/components/PhotoCollage';
import { PopoverMenu } from '@/components/PopoverMenu';
import { ProfileLayout } from '@/components/ProfileLayout';
import { Text } from '@/components/Text';
import { colors, screenPadding, spacing } from '@/constants/theme';
import { useApp, useDayProgress } from '@/hooks/useAppState';

/**
 * Experiment: the day's tasks as the same mosaic block the calendar's own day
 * cells cut theirs — photos merged edge to edge behind a hairline seam, no
 * frames and no dashes — except every task gets a tile, done or not, and each
 * one carries its own label rather than an accessibility string. An
 * unphotographed tile is a flat, quiet fill; there is no separate list below
 * it any more, so the grid stands in for the page rather than sitting on it,
 * and is sized to fill almost all of it.
 */

export default function TodoScreen() {
  const router = useRouter();
  const { currentDay, totalDays, undoTask } = useApp();

  // The page is today and nothing else: with the tick scrubber gone there is
  // no way to park on another day, so the grid reads off the current one.
  const rows = useDayProgress(currentDay);
  const done = rows.filter((row) => row.done).length;

  /**
   * The space the page actually leaves for the grid, once the heading above
   * it has taken its own room. The mosaic block is drawn square by default;
   * handing it this box's own ratio (height ÷ width) instead is what lets it
   * stand as tall as the page rather than only as tall as it is wide.
   */
  const [gridBox, setGridBox] = useState<LayoutRectangle | null>(null);
  const gridWidth = gridBox ? gridBox.width - screenPadding * 2 : 0;
  const gridRatio = gridWidth > 0 && gridBox ? gridBox.height / gridWidth : 1;

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

  return (
    <>
      {/* No identity: the avatar belongs on the Profile tab, and this screen
          leads with the day itself. */}
      <ProfileLayout
        tabBar
        padded={false}
        // The grid stands in for the page, so it takes whatever height the
        // heading above it leaves rather than sitting at its own.
        fill
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
        {/* Experiment: no separate list — every task is a tile in the day's
            own mosaic, the label set inside it rather than beside it, a
            camera glyph in the ones still waiting to say a tap shoots the
            photo that finishes them. A photographed tile shows the print
            itself and asks retake-or-undo the way the row's filled circle
            used to — there is no tick on the corner any more, since a task's
            place in the mosaic already says it is done. */}
        <View
          style={styles.gridArea}
          onLayout={(e) => setGridBox(e.nativeEvent.layout)}
        >
          {gridBox ? (
            <PhotoCollage
              layout="mosaic"
              showLabels
              ratio={gridRatio}
              style={styles.grid}
              cells={rows.map((row) => ({
                key: row.task.id,
                label: row.task.label,
                photo: row.photo,
                seed: row.photoSeed,
                onPress: pressSlot(row),
              }))}
            />
          ) : null}
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
  gridArea: {
    flex: 1,
    // Clear of the title above it.
    marginTop: spacing['2xl'],
  },
  grid: {
    // The tile hangs off the page's own gutter, the same one every other
    // screen hangs off. Subtracted by hand from `gridArea`'s own measured
    // width to work out the ratio the block is asked to fill — the two have
    // to agree on the same inset.
    paddingHorizontal: screenPadding,
  },
});
