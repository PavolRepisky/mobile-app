import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Alert, Linking, StyleSheet, View, useColorScheme } from 'react-native';

import { AlertDialog } from '@/components/AlertDialog';
import { CameraSheet } from '@/components/CameraSheet';
import { EmptyState } from '@/components/EmptyState';
import { DayStamp } from '@/components/FriendCard';
import { PhotoCollage, type CollageCell } from '@/components/PhotoCollage';
import { PopoverMenu } from '@/components/PopoverMenu';
import { NATIVE_HEADER, ScreenScroll } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TaskRing } from '@/components/TaskRing';
import { Text } from '@/components/Text';
import { colors, colorsFor, layout, radii } from '@/constants/theme';
import {
  useApp,
  useDayProgress,
} from '@/hooks/useAppState';
import { timeLeftToday } from '@/lib/format';

/**
 * Today's post being filled in, and one button to fill it: the day and its
 * era over the post's grid, a square for every photo it needs, then a row
 * with the lives, a shutter and the clock. The shutter wears the day's task
 * ring, a segment per photo in, so the one thing to press also says how far
 * the day has got. It raises the camera card over the page for the first
 * open square; tapping an open square does the same for that one. The task
 * a photo proves is picked in the camera, any open one a swipe away, since the tasks keep no order and nothing is "next". A
 * square that's in shows its shot, and tapping it offers a retake or an
 * undo. Once the last one is in, the post is stamped the way it goes up on
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

/** The lives beside the shutter, at about the clock's cap height opposite. */
const HEART = 16;
/** The shutter, ring and all: a thumb's whole pad, big enough to be the one
 * thing on the page to press. */
const SHUTTER = 112;
/** The camera glyph inside it, over its count. */
const SHUTTER_GLYPH = 28;

export default function TasksScreen() {
  const {
    currentDay,
    totalDays,
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
  /** The shot whose square was tapped, waiting on retake, undo or cancel. */
  const [doneFor, setDoneFor] = useState<{ taskId: string; slot: number } | null>(null);
  const scheme = colorsFor(useColorScheme());

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
    photo: row.done ? row.photo : null,
    seed: row.done ? row.photoSeed : null,
    time: row.done ? row.time : undefined,
    // Mid-upload a square waits for its save to land, so an undo can never
    // reach the server ahead of the photo it would remove.
    onPress:
      waiting || row.pending
        ? undefined
        : row.done
          ? () => setDoneFor({ taskId: row.task.id, slot })
          : () => openSquare(slot, row.task.id),
  }));
  const doneTask = doneFor ? tasks.find((task) => task.id === doneFor.taskId) : undefined;
  const retakeTask = shooting?.retake
    ? tasks.find((task) => task.id === shooting.taskId)
    : undefined;
  const retake = () => {
    if (doneFor) {
      if (NATIVE_HEADER && SYSTEM_CAMERA) void shootWithSystemCamera(doneFor.taskId, doneFor.slot);
      else setShooting({ slot: doneFor.slot, taskId: doneFor.taskId, retake: true });
    }
    setDoneFor(null);
  };
  const undo = () => {
    if (doneFor) undoTask(doneFor.taskId, currentDay);
    setDoneFor(null);
  };

  /** The shutter: the camera for the first open square that isn't still
   * saving — any open task can still go in it, picked in the camera — and
   * once the post is up, the post itself on Community. */
  const shutter = () => {
    if (allDone) {
      router.navigate('/community');
      return;
    }
    const slot = rows.findIndex((row) => !row.done && !row.pending);
    if (slot >= 0) openSquare(slot, rows[slot].task.id);
  };
  const left = rows.length - done;
  const lastDay = currentDay >= totalDays;

  return (
    <>
      <ScreenScroll
        tabBar
        onRefresh={reload}
        header={<ScreenHeader plainTitle="Tasks" showBack={false} />}
      >
        {/* Which day, and of which era — the tab is shared by whatever
            you've joined, and the name opens its feed. */}
        <View style={styles.heading}>
          <Text variant="sectionHeading">{waiting ? 'Your first post' : `Day ${currentDay}`}</Text>
          <Text
            variant="meta"
            color={colors.inkMuted}
            numberOfLines={1}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/feed/[id]', params: { id: challenge.id } })}
            style={styles.era}
          >
            {challenge.name}
          </Text>
        </View>

        {/* The post itself, a square for every photo; stamped once the last
            one is in. The open squares are only grey — the shutter under
            them is what's pressed — though a tap on one still opens the
            camera for it. Before Day 1 it is only the shape of what's to come. */}
        <PhotoCollage cells={cells} bare={waiting} plainOpen>
          {allDone ? <DayStamp day={currentDay} kicker={challenge.name} /> : null}
        </PhotoCollage>

        {/* The lives, the shutter, the clock — one row, the shutter between
            what you can lose and how long is left to keep it. */}
        <View style={styles.dock}>
          <View style={styles.side}>
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
            <Text variant="meta" color={colors.inkMuted}>
              {livesLeft === 1 ? '1 life left' : `${livesLeft} lives left`}
            </Text>
          </View>

          {/* The day's own task ring round the button — a segment per photo
              in, in the accent — so pressing it and seeing how far you've
              got are the same glance. Blue to shoot (ink off the iPhone),
              ink with a tick once the post is up, grey until Day 1. */}
          <TaskRing
            avatar={null}
            done={waiting ? 0 : done}
            total={rows.length}
            size={SHUTTER}
            badge={false}
            look="profile"
            onPress={waiting ? undefined : shutter}
            accessibilityLabel={
              waiting
                ? 'Opens on Day 1'
                : allDone
                  ? 'Posted — see it on Community'
                  : `Take a photo, ${left} to go`
            }
          >
            <View
              style={[
                styles.shutter,
                waiting ? styles.shutterWaiting : allDone ? styles.shutterDone : styles.shutterOpen,
              ]}
            >
              {NATIVE_HEADER ? (
                <SymbolView
                  name={allDone ? 'checkmark' : 'camera.fill'}
                  size={SHUTTER_GLYPH}
                  tintColor={waiting ? scheme.inkGhost : allDone ? scheme.inkInverse : scheme.onMedia}
                  weight="semibold"
                />
              ) : (
                <Ionicons
                  name={allDone ? 'checkmark' : 'camera'}
                  size={SHUTTER_GLYPH}
                  color={waiting ? colors.inkGhost : allDone ? colors.inkInverse : colors.onMedia}
                />
              )}
              <Text
                variant="badge"
                color={waiting ? colors.inkMuted : allDone ? colors.inkInverse : colors.onMedia}
              >
                {waiting ? 'Day 1' : allDone ? 'Posted' : `${left} to go`}
              </Text>
            </View>
          </TaskRing>

          {/* The clock, or what comes after it. The last hour says so in
              ink, not the red, which is kept for what can't be undone. */}
          <View style={styles.side}>
            <Text variant="copyBold" center>
              {waiting
                ? daysUntilStart === 1
                  ? 'Tomorrow'
                  : `In ${daysUntilStart} days`
                : allDone
                  ? lastDay
                    ? 'Era done'
                    : 'Tomorrow'
                  : timeLeftToday(now)}
            </Text>
            <Text
              variant={lastHour && !waiting && !allDone ? 'metaBold' : 'meta'}
              color={lastHour && !waiting && !allDone ? colors.ink : colors.inkMuted}
              center
            >
              {waiting
                ? 'Day 1 starts'
                : allDone
                  ? lastDay
                    ? 'every day in'
                    : `Day ${currentDay + 1}`
                  : lastHour
                    ? 'last hour'
                    : 'left today'}
            </Text>
          </View>
        </View>
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
        kicker={
          retakeTask ? `Day ${currentDay} · retake` : `Day ${currentDay} · ${openRows.length} left`
        }
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

      {/* A shot's choices. On the iPhone the system's action sheet, where the
          red Undo is its own confirmation; elsewhere the app's window, which
          says what an undo takes with it. */}
      {NATIVE_HEADER ? (
        <PopoverMenu
          visible={doneFor !== null}
          onDismiss={() => setDoneFor(null)}
          top={0}
          items={[
            { label: 'Retake Photo', onPress: retake },
            { label: 'Undo Task', destructive: true, onPress: undo },
          ]}
        />
      ) : (
        <AlertDialog
          visible={doneFor !== null}
          title={doneTask?.label ?? 'Photo'}
          message="Undoing removes today's photo too — you can shoot it again afterwards."
          onDismiss={() => setDoneFor(null)}
          actions={[
            { label: 'Cancel', onPress: () => setDoneFor(null) },
            { label: 'Retake', onPress: retake },
            { label: 'Undo Task', destructive: true, onPress: undo },
          ]}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: layout.inline,
    marginBottom: layout.heading,
  },
  era: {
    flexShrink: 1,
  },
  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: layout.section,
  },
  // Even either side, so the shutter lands on the page's centre line
  // whatever the words beside it run to.
  side: {
    flex: 1,
    alignItems: 'center',
    gap: layout.line,
  },
  hearts: {
    flexDirection: 'row',
    gap: layout.line / 2,
  },
  shutter: {
    flex: 1,
    alignSelf: 'stretch',
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: layout.line / 2,
  },
  // The system blue on the iPhone, where every button that does the thing
  // wears it; ink on the drawn design elsewhere.
  shutterOpen: {
    backgroundColor: NATIVE_HEADER ? colors.systemAccent : colors.ink,
  },
  shutterDone: {
    backgroundColor: colors.ink,
  },
  shutterWaiting: {
    backgroundColor: colors.surfaceSunken,
  },
});
