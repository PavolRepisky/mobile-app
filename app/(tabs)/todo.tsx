import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { AlertDialog } from '@/components/AlertDialog';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import { PhotoCollage } from '@/components/PhotoCollage';
import { PopoverMenu } from '@/components/PopoverMenu';
import { ProfileLayout } from '@/components/ProfileLayout';
import { TaskRow } from '@/components/TaskRow';
import { Text } from '@/components/Text';
import { colors, screenPadding, spacing } from '@/constants/theme';
import { useApp, useDayProgress } from '@/hooks/useAppState';

/**
 * Degrees off straight for the writing on the photo block. Barely anything —
 * a hand writing on a page it is already holding does not swing far, and past
 * a couple of degrees it stops reading as handwriting and starts reading as a
 * sticker someone stuck on at an angle.
 */
const SCRIPT_TILT = -3;

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
            {/* How far into today. Where today stands in the challenge used
                to be on this line too, and is now written across the photos
                below — saying it in both places was saying it twice. */}
            <Text variant="label" color={colors.inkMuted}>
              {done === rows.length
                ? 'All done'
                : `${done} of ${rows.length} done`}
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
        {/* The day as its pictures. Every task holds a place from the moment
            the day opens — photographed ones as the photo, the rest as the gap
            it will fill — so the block is the shape of the whole day and builds
            up through it rather than appearing at the end. The list below
            carries the labels and the times; this carries only the pictures.
            Laid out as the five on a die for now: the scattered version was
            fighting the photos rather than framing them. */}
        <View style={styles.block}>
          <PhotoCollage
            layout="dice"
            style={styles.collage}
            cells={rows.map((row) => ({
              key: row.task.id,
              label: row.task.label,
              photo: row.photo,
              seed: row.photoSeed,
              done: row.done,
              onPress: pressPhoto(row),
            }))}
          />

          {/* Written straight across the middle of the block, over the photos
              rather than beside them. `pointerEvents` off so the tiles
              underneath keep their taps — the writing is on the photos, not
              between them and the finger. */}
          <View pointerEvents="none" style={styles.script}>
            <Text
              variant="script"
              color={colors.inkInverse}
              style={styles.scriptInk}
            >{`day ${currentDay} / ${totalDays}`}</Text>
          </View>
        </View>

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
  block: {
    // Clear of the title above it.
    marginTop: spacing['2xl'],
  },
  collage: {
    // The tiles hang off the page's own gutter.
    paddingHorizontal: screenPadding,
  },
  script: {
    // Over the whole block, centred on it: the middle of the four tiles is the
    // one place a line can run right across the block without any one photo
    // owning it.
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: `${SCRIPT_TILT}deg` }],
  },
  scriptInk: {
    // White, with the dark edge that lets it hold anywhere it lands: the
    // middle of the block is a white mat on a day the fifth task is
    // photographed, a pale gap on a day it is not, and the photograph itself
    // at the corners. White alone would disappear into the first two.
    textShadowColor: colors.ink,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 9,
  },
  list: {
    marginTop: spacing['2xl'],
    // The page's own gutter, the same one the photo grid hangs off. The card
    // used to run wider than everything above it, which put the task text
    // closer to the edge of the screen than anything else on the app.
    marginHorizontal: screenPadding,
  },
});
