import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlertDialog } from '@/components/AlertDialog';
import { IconButton } from '@/components/IconButton';
import { PhotoCollage } from '@/components/PhotoCollage';
import { PopoverMenu } from '@/components/PopoverMenu';
import { profileActionHeight, profileActionTop } from '@/components/ProfileLayout';
import { Screen, topPadding } from '@/components/Screen';
import { TaskCameraGrid } from '@/components/TaskCameraGrid';
import { Text } from '@/components/Text';
import { colors, screenPadding, shadows, spacing } from '@/constants/theme';
import { useApp, useDayProgress } from '@/hooks/useAppState';

/**
 * The day opens on a plain grid of task prints — one tile per task, evenly
 * gapped, the same dashed-outline-and-camera-glyph tile `PhotoSlot` draws for
 * every task row elsewhere in the app — with an open task's tile inviting a
 * tap. That tap is the only way into the live camera grid, where every other
 * open task sits over the viewfinder as a frosted, labelled tile until it is
 * shot; closing the camera, or finishing the last task, drops back to the
 * calm view.
 */

/** Matches the corner action buttons elsewhere — Discover's add challenge,
 * the create-challenge screen's back/save. */
const EDIT_SIZE = 46;

export default function TodoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentDay, undoTask, completeTaskWithPhoto } = useApp();

  // The page is today and nothing else: with the tick scrubber gone there is
  // no way to park on another day, so the grid reads off the current one.
  const rows = useDayProgress(currentDay);
  const done = rows.filter((row) => row.done).length;
  const allDone = rows.length > 0 && done === rows.length;

  /**
   * The camera is opt-in: the tab always opens on the calm view, and this
   * only turns false while the live grid is up, from tapping an open tile.
   * Closing it — there's nowhere else on the tab to go — drops back to the
   * calm view the same way finishing the last task already does on its own.
   * Reset whenever the day itself changes, so paging to a new day never
   * carries the previous one's camera state with it.
   */
  const [cameraDismissed, setCameraDismissed] = useState(true);
  useEffect(() => setCameraDismissed(true), [currentDay]);
  const showCamera = !allDone && !cameraDismissed;

  const [menuOpen, setMenuOpen] = useState(false);
  const [restartOpen, setRestartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  /** The done task whose photo was tapped, waiting on undo-or-cancel. */
  const [doneFor, setDoneFor] = useState<string | null>(null);

  // Lines the title up on the same row every other tab root's corner button
  // sits on, the way Discover's and Calendar's own titles do.
  const headerTop = Math.max(profileActionTop, topPadding(insets.top));
  const titleOffset = headerTop - topPadding(insets.top);

  return (
    <>
      {showCamera ? (
        // Full-bleed and bare, the way `/photo/camera` already is — no day
        // heading, no pencil menu, no tab bar. Restart/End/Change Challenge
        // stay reachable from the calm view's pencil below, not from here.
        <TaskCameraGrid
          day={currentDay}
          rows={rows}
          onCapture={completeTaskWithPhoto}
          onUndo={undoTask}
          onClose={() => setCameraDismissed(true)}
        />
      ) : (
        // Plain, centred title — the same header Discover and Calendar use —
        // rather than an identity of its own. Wrapped unpadded, the way those
        // two are, so the pencil sits from the true screen edge instead of
        // doubling up on the page's own gutter.
        <View style={styles.screenRoot}>
          <Screen padded={false} tabBar>
            <View style={[styles.titleBand, { marginTop: titleOffset }]}>
              <Text variant="sectionTitle" center>
                ToDo
              </Text>
            </View>

            {/* The calm record: every task its own print. Tapping a done tile
                offers to undo it; tapping an open one (closed out of the
                camera without finishing the day) drops straight back into
                the live grid. */}
            <View style={styles.gridArea}>
              <PhotoCollage
                layout="grid"
                style={styles.grid}
                cells={rows.map((row) => ({
                  key: row.task.id,
                  label: row.task.label,
                  photo: row.photo,
                  seed: row.photoSeed,
                  time: row.time,
                  onPress: () =>
                    row.done ? setDoneFor(row.task.id) : setCameraDismissed(false),
                }))}
              />
            </View>
          </Screen>

          <IconButton
            name="pencil"
            size={EDIT_SIZE}
            iconSize={20}
            background={colors.ink}
            color={colors.inkInverse}
            shadow={false}
            onPress={() => setMenuOpen(true)}
            accessibilityLabel="Challenge options"
            style={[styles.corner, { top: headerTop }, shadows.floating]}
          />
        </View>
      )}

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
            label: 'End Challenge',
            onPress: () => setEndOpen(true),
          },
          {
            label: 'Change Challenge',
            // The in-app select/custom-build screen is gone — browsing and
            // joining a challenge now happens the one way Discover already
            // does it for everyone else.
            onPress: () => router.push('/discover'),
          },
        ]}
      />

      <AlertDialog
        visible={doneFor !== null}
        title="Undo Task"
        message="This removes today's photo too — you can shoot it again from the grid afterwards."
        onDismiss={() => setDoneFor(null)}
        actions={[
          { label: 'Cancel', onPress: () => setDoneFor(null) },
          {
            label: 'Undo Task',
            destructive: true,
            onPress: () => {
              if (doneFor) undoTask(doneFor, currentDay);
              setDoneFor(null);
            },
          },
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

      <AlertDialog
        visible={endOpen}
        title="End Challenge"
        message="Are you sure you want to end this challenge? Your progress will be lost."
        onDismiss={() => setEndOpen(false)}
        actions={[
          { label: 'Cancel', onPress: () => setEndOpen(false) },
          {
            label: 'End Challenge',
            destructive: true,
            // Same stub as Restart above: confirming only closes the dialog
            // until there is somewhere for ending a challenge to actually lead.
            onPress: () => setEndOpen(false),
          },
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  // Absolute overlays (the corner button) need a positioned parent, otherwise
  // their offsets resolve against the screen's own children instead of it.
  screenRoot: {
    flex: 1,
  },
  titleBand: {
    minHeight: profileActionHeight,
    justifyContent: 'center',
    paddingHorizontal: screenPadding,
  },
  corner: {
    position: 'absolute',
    right: screenPadding,
  },
  gridArea: {
    flex: 1,
    // Centred rather than pinned to the top: a plain grid this short has no
    // reason to claim the full height between the heading and the tab bar.
    justifyContent: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  grid: {
    // The tile hangs off the page's own gutter, the same one every other
    // screen hangs off.
    paddingHorizontal: screenPadding,
  },
});
