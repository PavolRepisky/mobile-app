import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { AlertDialog } from '@/components/AlertDialog';
import { CameraSheet } from '@/components/CameraSheet';
import { ChallengeRun, type RunDay } from '@/components/ChallengeRun';
import { CheckCircle } from '@/components/CheckCircle';
import { EmptyState } from '@/components/EmptyState';
import { DayStamp } from '@/components/FriendCard';
import { PhotoCollage, type CollageCell } from '@/components/PhotoCollage';
import { PhotoViewer } from '@/components/PhotoViewer';
import { PopoverMenu } from '@/components/PopoverMenu';
import { NATIVE_HEADER, ScreenScroll } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Text } from '@/components/Text';
import { colors, layout, radii } from '@/constants/theme';
import {
  useApp,
  useDayProgress,
} from '@/hooks/useAppState';
import { timeLeftToday } from '@/lib/format';

/**
 * Today's post being filled in: the day and its era over the post's grid,
 * a square for every photo it needs, a line with the lives and the clock,
 * then a rounded row for every task still to shoot. A row raises the camera
 * card over the page on its task; tapping an open square does the same for
 * that square. The task
 * a photo proves is picked in the camera, any open one a swipe away, since the tasks keep no order and nothing is "next". A
 * square that's in shows its shot, and tapping it opens the photo full size,
 * with a retake and a remove under it. Once the last one is in, the post is stamped the way it goes up on
 * Community.
 *
 * On the iPhone the parts round the grid are the system's: a shot's choices
 * are its action sheet, and the camera is the
 * phone's own Camera screen. Its task is picked first, from an action sheet
 * of the open ones, since that screen can't name one; with one left it goes
 * straight to the camera. When each task nudges you
 * is set in Settings, off My Profile, so the page is only the doing.
 *
 * Joined but before Day 1 — where joining almost always leaves you, since it
 * shuts once a round starts — the run waits with every square to come, and a
 * line says when the first photos go up. Not in an era at all, the page
 * points to Discover instead.
 */

/**
 * The iPhone's own Camera screen in place of the app's camera card, tried
 * and set aside for the card with the system's parts in it. Kept so the two
 * can be compared again: on, an open square picks its task from an action
 * sheet and opens the system camera.
 */
const SYSTEM_CAMERA = false;

/** The hearts before the lives count, at about its cap height. */
const HEART = 14;
/** A task row's height — a thumb's target with room round its circle. */
const PILL_HEIGHT = 60;
/** The check circle leading a task's row. */
const PILL_CHECK = 28;

export default function TasksScreen() {
  const {
    currentDay,
    totalDays,
    startDate,
    progress,
    challenge,
    tasks,
    livesLeft,
    livesTotal,
    undoTask,
    completeTaskWithPhoto,
    inChallenge,
    daysUntilStart,
    loadFailed,
    reload,
    syncError,
    clearSyncError,
  } = useApp();
  const router = useRouter();
  const waiting = daysUntilStart > 0;

  // Each day of the run as the card squares it: how many tasks got done,
  // and how many photos came of it.
  const runDay = useCallback(
    (day: number): RunDay => ({
      done: tasks.filter((task) => progress[day]?.[task.id]?.done).length,
      shots: tasks.filter((task) => {
        const entry = progress[day]?.[task.id];
        return entry?.photo || entry?.photoSeed;
      }).length,
    }),
    [tasks, progress],
  );

  // In the post's own order, square by square.
  const rows = useDayProgress(currentDay);
  const done = rows.filter((row) => row.done).length;
  const allDone = rows.length > 0 && done === rows.length;
  // The tasks still to shoot, in the era's own list order — the camera's
  // choices for an open square.
  const openRows = tasks.flatMap((task) =>
    rows.filter((row) => row.task.id === task.id && !row.done),
  );


  // The countdown only needs the minute, so it ticks once a minute.
  const [now, setNow] = useState(() => new Date());
  // The day closes at midnight, so past eleven the clock is the whole story.
  const lastHour = now.getHours() >= 23;
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  /** The square the camera card is filling and the task picked for it —
   * or, on a retake, the one task already in it; null while the card is
   * down. */
  const [shooting, setShooting] = useState<{
    slot: number;
    taskId: string;
    retake?: boolean;
  } | null>(null);
  useEffect(() => setShooting(null), [currentDay]);

  /** On the iPhone, the open square waiting on its task to be picked
   * before the system camera opens. */
  const [choosingFor, setChoosingFor] = useState<number | null>(null);
  /** The shot opened full size from its square or its row. */
  const [viewing, setViewing] = useState<{ taskId: string; slot: number } | null>(null);
  /** The shot waiting on its remove to be confirmed. */
  const [removing, setRemoving] = useState<{ taskId: string; slot: number } | null>(null);
  /** What the viewer's button asked for, run once the viewer has finished
   * fading — presenting the camera or a dialog on top of a modal that is
   * still dismissing loses it on iOS. */
  const afterViewer = useRef<(() => void) | null>(null);

  if (!inChallenge) {
    return (
      <ScreenScroll
        tabBar
        onRefresh={reload}
        header={<ScreenHeader plainTitle="Tasks" showBack={false} />}
      >
        {loadFailed ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="Couldn’t load your era"
            hint="Check your connection and try again."
            action={{ label: 'Try again', onPress: () => reload() }}
          />
        ) : (
          <EmptyState
            icon="sparkles-outline"
            title="Your next era starts here"
            hint="Small things, every day, add up to someone new. Pick an era and watch it happen, one photo at a time."
            action={{ label: 'Join an era', onPress: () => router.navigate('/discover') }}
          />
        )}
      </ScreenScroll>
    );
  }

  /**
   * The phone's own Camera screen, for one task's square: its shutter,
   * flash, lenses and zoom, then Retake or Use Photo. The whole shot is
   * kept, and its square crops it to fill like every photo in the post.
   */
  const shootWithSystemCamera = async (taskId: string, slot: number) => {
    const access = await ImagePicker.requestCameraPermissionsAsync();
    if (!access.granted) {
      Alert.alert(
        'Camera access',
        'Turn on camera access in Settings to take your photos.',
        access.canAskAgain
          ? [{ text: 'OK' }]
          : [
              { text: 'Not Now', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ],
      );
      return;
    }
    try {
      const shot = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
      const uri = shot.canceled ? undefined : shot.assets[0]?.uri;
      if (uri) completeTaskWithPhoto(taskId, { uri }, undefined, slot);
    } catch {
      // The camera couldn't open (the simulator has none); the square stays open.
    }
  };

  /** An open square tapped: the system camera on the iPhone, its task picked
   * first unless only one is left; the app's camera card elsewhere. */
  const openSquare = (slot: number, suggested: string) => {
    if (!NATIVE_HEADER || !SYSTEM_CAMERA) {
      setShooting({ slot, taskId: suggested });
    } else if (openRows.length === 1) {
      void shootWithSystemCamera(openRows[0].task.id, slot);
    } else {
      setChoosingFor(slot);
    }
  };

  // Square by square in the post's own order: a shot in its square, an open
  // one asking for its photo. Before Day 1 the squares are only shown.
  const cells: CollageCell[] = rows.map((row, slot) => ({
    key: row.task.id,
    label: row.done ? row.task.label : undefined,
    placeholder: `Slot ${slot + 1}`,
    photo: row.done ? row.photo : null,
    seed: row.done ? row.photoSeed : null,
    time: row.done ? row.time : undefined,
    // Mid-upload a square waits for its save to land, so an undo can never
    // reach the server ahead of the photo it would remove.
    onPress:
      waiting || row.pending
        ? undefined
        : row.done
          ? () => setViewing({ taskId: row.task.id, slot })
          : () => openSquare(slot, row.task.id),
  }));
  const retakeTask = shooting?.retake
    ? tasks.find((task) => task.id === shooting.taskId)
    : undefined;
  const viewedRow = viewing ? rows[viewing.slot] : undefined;
  const removingTask = removing ? tasks.find((task) => task.id === removing.taskId) : undefined;

  /** Closes the viewer, then runs `next` once it has gone. */
  const leaveViewer = (next: () => void) => {
    setViewing(null);
    if (Platform.OS === 'ios') afterViewer.current = next;
    else next();
  };
  const retake = (shot: { taskId: string; slot: number }) => {
    if (NATIVE_HEADER && SYSTEM_CAMERA) void shootWithSystemCamera(shot.taskId, shot.slot);
    else setShooting({ slot: shot.slot, taskId: shot.taskId, retake: true });
  };
  const remove = () => {
    if (removing) undoTask(removing.taskId, currentDay);
    setRemoving(null);
  };

  const lastDay = currentDay >= totalDays;

  return (
    <>
      <ScreenScroll
        tabBar
        onRefresh={reload}
        header={<ScreenHeader plainTitle="Tasks" showBack={false} />}
      >
        {/* The post itself, a square for every photo; stamped once the last
            one is in. The open squares are only grey — the task rows under
            them are what's pressed — though a tap on one still opens the
            camera for it. Before Day 1 it is only the shape of what's to come. */}
        <PhotoCollage cells={cells} bare={waiting} plainOpen>
          {allDone ? <DayStamp day={currentDay} kicker={challenge.name} /> : null}
        </PhotoCollage>

        {/* Every task of the day, a rounded row each: the circle at the
            front fills with a tick once its photo is in, the name says what
            goes in and the note how. An open row opens the camera on its
            task; a done one opens its photo, to retake or remove. */}
        {/* The one line over the list: how far the day has got, then the
            time left in ink — the last hour says so, in ink, not the red,
            which is kept for what can't be undone — and at the far end the
            lives the era still allows. */}
        <View style={styles.listHeading}>
          <Text variant="meta" color={colors.inkMuted} numberOfLines={1} style={styles.listHeadingCount}>
            {waiting ? 'Opens on Day 1' : `${done} of ${rows.length}`}
            {' · '}
            <Text variant="metaBold">
              {waiting
                ? daysUntilStart === 1
                  ? 'tomorrow'
                  : `in ${daysUntilStart} days`
                : allDone
                  ? lastDay
                    ? 'Era done'
                    : 'Posted'
                  : lastHour
                    ? `${timeLeftToday(now)} · last hour`
                    : `${timeLeftToday(now)} left`}
            </Text>
          </Text>
          <View
            style={styles.hearts}
            accessible
            accessibilityLabel={`${livesLeft} of ${livesTotal} lives left`}
          >
            {Array.from({ length: livesTotal }, (_, i) => (
              <Ionicons
                key={i}
                name="heart"
                size={HEART}
                color={i < livesLeft ? colors.ink : colors.inkGhost}
              />
            ))}
          </View>
        </View>
        <View style={styles.tasks}>
          {rows.map((row, slot) => (
            <TaskPill
              key={row.task.id}
              label={row.task.label}
              note={row.task.note}
              done={row.done}
              onPress={
                waiting || row.pending
                  ? undefined
                  : row.done
                    ? () => setViewing({ taskId: row.task.id, slot })
                    : () => openSquare(slot, row.task.id)
              }
            />
          ))}
        </View>

        {/* The whole run so far, a square a day, at the foot of the page —
            a white card on its shadow, set apart from the grey task rows
            without the ink block's weight. */}
        <ChallengeRun
          challenge={challenge}
          startDate={startDate}
          currentDay={waiting ? 0 : currentDay}
          totalDays={totalDays}
          taskCount={tasks.length}
          dayOf={runDay}
          tone="quiet"
          style={styles.run}
        />
      </ScreenScroll>

      <CameraSheet
        visible={shooting !== null}
        tasks={
          retakeTask
            ? [{ id: retakeTask.id, label: retakeTask.label, note: retakeTask.note }]
            : openRows.map((row) => ({
                id: row.task.id,
                label: row.task.label,
                note: row.task.note,
              }))
        }
        taskId={shooting?.taskId ?? null}
        // Any open task can go in the tapped square, not only the one it
        // suggested — swiping through them is how the owner lays out their
        // own post. A retake is the one task already there.
        swipeTasks={!retakeTask}
        onChangeTask={(taskId) => setShooting((open) => (open ? { ...open, taskId } : open))}
        onCapture={(taskId, photo) => {
          completeTaskWithPhoto(taskId, photo, undefined, shooting?.slot);
          setShooting(null);
        }}
        onClose={() => setShooting(null)}
      />

      {/* A photo or an undo that didn't reach the server: the task is already
          back how it was, so this only has to say so. Comes seconds after
          the camera card has gone, so it never stacks on it. */}
      <AlertDialog
        visible={syncError !== null}
        title="Not saved"
        message={syncError ?? ''}
        onDismiss={clearSyncError}
        actions={[{ label: 'OK', primary: true, onPress: clearSyncError }]}
      />

      {/* Which task an open square is for, as the system's action sheet,
          the era's open tasks in their own order; the camera opens once it
          has gone. */}
      {NATIVE_HEADER && SYSTEM_CAMERA ? (
        <PopoverMenu
          visible={choosingFor !== null}
          onDismiss={() => setChoosingFor(null)}
          top={0}
          items={openRows.map((row) => ({
            label: row.task.label,
            onPress: () => {
              const slot = choosingFor;
              setChoosingFor(null);
              if (slot !== null) void shootWithSystemCamera(row.task.id, slot);
            },
          }))}
        />
      ) : null}

      {/* A shot, opened full size from its square or its row, with what
          can be done to it along the bottom: shoot it again, or take it out
          of the post. */}
      <PhotoViewer
        photos={viewedRow ? [viewedRow.photo ?? viewedRow.photoSeed ?? viewedRow.task.id] : []}
        index={viewing && viewedRow ? 0 : null}
        onDismiss={() => setViewing(null)}
        onDismissed={() => {
          const next = afterViewer.current;
          afterViewer.current = null;
          next?.();
        }}
        actions={[
          {
            key: 'retake',
            label: 'Retake',
            icon: 'sync-outline',
            onPress: () => {
              const shot = viewing;
              if (shot) leaveViewer(() => retake(shot));
            },
          },
          {
            key: 'remove',
            label: 'Remove',
            icon: 'trash-outline',
            destructive: true,
            onPress: () => {
              const shot = viewing;
              if (shot) leaveViewer(() => setRemoving(shot));
            },
          },
        ]}
      />

      {/* Removing asks first, saying what it takes with it. */}
      <AlertDialog
        visible={removing !== null}
        title="Remove this photo?"
        message={`It comes out of your Day ${currentDay} post and ${removingTask?.label ?? 'the task'} is open again.`}
        onDismiss={() => setRemoving(null)}
        actions={[
          { label: 'Cancel', onPress: () => setRemoving(null) },
          { label: 'Remove', destructive: true, onPress: remove },
        ]}
      />
    </>
  );
}

/**
 * One task of the day: the check circle at the front — an empty ring while
 * it's open, the ink tick once its photo is in — then its name, and under
 * it the note in grey.
 */
function TaskPill({
  label,
  note,
  done,
  onPress,
}: {
  label: string;
  note?: string;
  done: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={done ? `${label}, done` : `Take the ${label} photo`}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
    >
      <CheckCircle size={PILL_CHECK} empty={!done} />
      <View style={styles.pillText}>
        <Text variant="copyBold" numberOfLines={1}>
          {label}
        </Text>
        {note ? (
          <Text variant="meta" color={colors.inkMuted} numberOfLines={2}>
            {note}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  run: {
    marginTop: layout.section,
  },
  hearts: {
    flexDirection: 'row',
    gap: layout.line / 2,
  },
  listHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: layout.inline,
    marginTop: layout.section,
    marginBottom: layout.heading,
  },
  listHeadingCount: {
    flexShrink: 1,
  },
  tasks: {
    gap: layout.stack,
  },
  // The rounded row off the lock-screen board, drawn solid on the page
  // rather than in glass, which is only for what floats over a photo.
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.inline,
    minHeight: PILL_HEIGHT,
    paddingHorizontal: layout.block,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceSunken,
  },
  pillText: {
    flex: 1,
    paddingVertical: layout.stack,
  },
  pressed: {
    opacity: 0.6,
  },
});
