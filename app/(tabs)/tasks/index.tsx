import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, TextInput, View, useColorScheme } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { AlertDialog } from '@/components/AlertDialog';
import { Avatar } from '@/components/Avatar';
import { CameraSheet } from '@/components/CameraSheet';
import { CheckCircle } from '@/components/CheckCircle';
import { EmptyState } from '@/components/EmptyState';
import { DayCover, shotClock } from '@/components/DayCover';
import { PhotoCollage, type CollageCell } from '@/components/PhotoCollage';
import { PhotoViewer } from '@/components/PhotoViewer';
import { Pill } from '@/components/Pill';
import { PopoverMenu } from '@/components/PopoverMenu';
import { NATIVE_HEADER, ScreenScroll } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ShareCoverSheet } from '@/components/ShareCoverSheet';
import { SlideToConfirm } from '@/components/SlideToConfirm';
import { Text } from '@/components/Text';
import { colors, colorsFor, gradients, layout, radii, type } from '@/constants/theme';
import {
  useApp,
  useDayProgress,
} from '@/hooks/useAppState';
import { timeLeftToday, timeStamp } from '@/lib/format';
import { isPosted, POST_COUNTDOWN_MS } from '@/lib/round';

/**
 * Today's post being filled in: the day and its era over the post's grid,
 * a square for every photo it needs, a line with the lives and the clock,
 * then a rounded row for every task still to shoot. A row raises the camera
 * card over the page on its task; tapping an open square does the same for
 * that square. The task
 * a photo proves is picked in the camera, any open one a swipe away, since the tasks keep no order and nothing is "next". A
 * square that's in shows its shot, and tapping it opens the photo full size,
 * with a retake and a remove under it. Once the last one is in, the post wears its cover, the way it goes up on
 * Community, and counts down to going up: until then a shot can still be
 * retaken or removed — removing one stops the countdown — and a caption
 * written under it. Once it's up, the post and its caption are fixed.
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
/** How long typing has to pause before a caption is saved — about a breath,
 * so a sentence goes up as one write rather than one per letter. */
const CAPTION_SAVE_MS = 800;
/** The longest caption the server keeps. */
const CAPTION_MAX = 500;
/** The countdown's ring, and the tick that takes its place once the post is
 * up — a size that heads the status row without crowding its two lines. */
const RING = 56;
/** The ring's stroke — the profile's challenge bar's. */
const RING_STROKE = 6;
const STATUS_MARK = RING;
/** Your face at the head of the caption, a comment composer's. */
const COMPOSER_AVATAR = 32;
/** A caption field tall enough for three lines before it grows. */
const CAPTION_MIN_HEIGHT = 72;

/** "1:05" — the minutes and seconds left of a post's countdown. */
const clock = (ms: number) => {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

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
    postsAt,
    captions,
    setCaption,
    postNow,
    profile,
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


  const [now, setNow] = useState(() => new Date());
  // The day closes at midnight, so past eleven the clock is the whole story.
  const lastHour = now.getHours() >= 23;
  // A finished day counts down to going up; once it has, it's fixed.
  const goesUpAt = postsAt[currentDay];
  const countingDown = allDone && goesUpAt !== undefined && !isPosted(goesUpAt, now.getTime());
  const isUp = allDone && !countingDown;
  // The day's clock only needs the minute; the post's countdown ticks by
  // the second.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), countingDown ? 1000 : 60_000);
    return () => clearInterval(id);
  }, [countingDown]);

  // The caption as it's being typed, saved once typing pauses — and at
  // once if the field is left — so the last words in before the countdown
  // runs out are the ones that go up.
  const savedCaption = captions[currentDay] ?? '';
  const [draft, setDraft] = useState(savedCaption);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const typing = useRef(false);
  // A new day, or the saved caption changing under the field — put back
  // after a failed save — shows in it; never while it's being typed in,
  // where it would trim the space just typed.
  useEffect(() => {
    if (!typing.current) setDraft(savedCaption);
  }, [savedCaption]);
  useEffect(() => setDraft(captions[currentDay] ?? ''), [currentDay]); // eslint-disable-line react-hooks/exhaustive-deps
  const saveCaption = () => {
    if (draftRef.current.trim() !== savedCaption) setCaption(currentDay, draftRef.current);
  };
  useEffect(() => {
    if (!countingDown || draft.trim() === savedCaption) return;
    const id = setTimeout(() => setCaption(currentDay, draft), CAPTION_SAVE_MS);
    return () => clearTimeout(id);
  }, [draft, countingDown, savedCaption, currentDay, setCaption]);

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
  /** The finished day open to share as a story. */
  const [sharing, setSharing] = useState(false);
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
        header={
          <ScreenHeader
            plainTitle="Tasks"
            showBack={false}
          />
        }
      >
        {/* The post itself, a square for every photo; once the last one is
            in, the day's cover laid over it — the same face the post wears on
            Community — letting taps through to the photos under it. The open squares are only grey — the task rows under
            them are what's pressed — though a tap on one still opens the
            camera for it. Before Day 1 it is only the shape of what's to come.
            It runs edge to edge, square-cornered, the way a post fills the
            screen on Community. */}
        <PhotoCollage cells={cells} bare={waiting} plainOpen radius={0} style={styles.post}>
          {allDone ? (
            <DayCover cells={cells} day={currentDay} totalDays={totalDays} kicker={challenge.name} />
          ) : null}
        </PhotoCollage>

        {/* Every photo in: the tasks are done with, so their rows give way
            to composing the post — the caption with your face at its head,
            then one window with the time left in a ring draining in the
            accent and a slide to post it now, last, where the thumb is.
            Once it's up: a tick, the caption as the post shows it, and the
            ways on. */}
        {allDone ? (
          countingDown ? (
            <View style={styles.finish}>
              <View style={styles.composer}>
                <Avatar source={profile.avatar ?? profile.avatarSeed} size={COMPOSER_AVATAR} />
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  onFocus={() => {
                    typing.current = true;
                  }}
                  onBlur={() => {
                    typing.current = false;
                    saveCaption();
                  }}
                  placeholder="Write a caption…"
                  placeholderTextColor={colors.inkMuted}
                  maxLength={CAPTION_MAX}
                  multiline
                  style={styles.captionInput}
                  accessibilityLabel="Caption"
                  accessibilityHint="Can be changed until the post goes up"
                />
              </View>

              {/* The post's last minute and a half in one window: the time
                  left, and the slide that skips the rest of it. */}
              <View style={styles.window}>
                <View style={styles.windowHead} accessible accessibilityLiveRegion="polite">
                  <CountdownRing
                    left={(goesUpAt - now.getTime()) / POST_COUNTDOWN_MS}
                    label={clock(goesUpAt - now.getTime())}
                  />
                  <View style={styles.statusText}>
                    <Text variant="itemTitle">Almost posted</Text>
                    <Text variant="meta" color={colors.inkMuted}>
                      Day {currentDay} goes up when the ring runs out. Tap a photo to retake or remove it.
                    </Text>
                  </View>
                </View>
                <SlideToConfirm
                  label="Slide to post"
                  onConfirm={() => {
                    postNow(draftRef.current);
                    setNow(new Date());
                  }}
                  style={styles.windowSlide}
                />
              </View>
            </View>
          ) : (
            <View style={styles.finish}>
              <View style={styles.status}>
                <CheckCircle size={STATUS_MARK} />
                <View style={styles.statusText}>
                  <Text variant="itemTitle">{lastDay ? 'Era done' : 'Posted'}</Text>
                  <Text variant="meta" color={colors.inkMuted}>
                    {lastDay
                      ? `All ${totalDays} days, done. Day ${currentDay} is up on Community.`
                      : goesUpAt !== undefined
                        ? `Day ${currentDay} went up on Community at ${shotClock(timeStamp(new Date(goesUpAt)))}.`
                        : `Day ${currentDay} is up on Community.`}
                  </Text>
                </View>
              </View>

              {/* The caption as the post shows it, opening on your handle. */}
              {savedCaption ? (
                <Text variant="body" style={styles.postedCaption}>
                  <Text variant="copyBold">{profile.handle} </Text>
                  {savedCaption}
                </Text>
              ) : null}

              <View style={styles.postedActions}>
                <Pill
                  tone="solid"
                  size="lg"
                  icon="download-outline"
                  label="Save your day"
                  onPress={() => setSharing(true)}
                  style={styles.postedAction}
                />
                <Pill
                  tone="outline"
                  size="lg"
                  icon="people-outline"
                  label="Community"
                  onPress={() => router.navigate('/community')}
                  style={styles.postedAction}
                />
              </View>
            </View>
          )
        ) : (
          <>
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
        {/* Every task of the day, a rounded row each: the circle at the
            front fills with a tick once its photo is in, the name says what
            goes in and the note how. An open row opens the camera on its
            task; a done one opens its photo, to retake or remove. */}
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
          </>
        )}
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
          of the post. Once the post is up, it's only looked at. */}
      <PhotoViewer
        photos={viewedRow ? [viewedRow.photo ?? viewedRow.photoSeed ?? viewedRow.task.id] : []}
        index={viewing && viewedRow ? 0 : null}
        onDismiss={() => setViewing(null)}
        onDismissed={() => {
          const next = afterViewer.current;
          afterViewer.current = null;
          next?.();
        }}
        actions={isUp ? [] : [
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

      <ShareCoverSheet
        visible={sharing && allDone}
        onDismiss={() => setSharing(false)}
        cells={cells}
        day={currentDay}
        totalDays={totalDays}
        kicker={challenge.name}
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
/**
 * The time left before the post goes up, as a ring draining anticlockwise
 * from twelve o'clock in the accent — the colour of progress — over the
 * page's white, with the minutes and seconds in its middle.
 */
function CountdownRing({ left, label }: { left: number; label: string }) {
  const svg = colorsFor(useColorScheme());
  const r = (RING - RING_STROKE) / 2;
  const around = 2 * Math.PI * r;
  const share = Math.max(0, Math.min(1, left));
  return (
    <View style={styles.ring}>
      <Svg width={RING} height={RING} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="countdownAccent" x1="0" y1="0" x2="1" y2="1">
            {gradients.accent.map((stop, i) => (
              <Stop key={stop} offset={i / (gradients.accent.length - 1)} stopColor={stop} />
            ))}
          </LinearGradient>
        </Defs>
        <Circle cx={RING / 2} cy={RING / 2} r={r} stroke={svg.surface} strokeWidth={RING_STROKE} fill="none" />
        <Circle
          cx={RING / 2}
          cy={RING / 2}
          r={r}
          stroke="url(#countdownAccent)"
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${around * share} ${around}`}
          transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
        />
      </Svg>
      <Text variant="metaBold" style={styles.ringClock}>
        {label}
      </Text>
    </View>
  );
}

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
  // Out past the page's gutter on both sides, so the post is the screen's
  // full width.
  post: {
    marginHorizontal: -layout.gutter,
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
  // What stands in for the task rows once every photo is in.
  finish: {
    marginTop: layout.section,
    gap: layout.block,
  },
  // Where the post stands, as one row on the task rows' grey: the ring or
  // the tick, then a title over a line of detail.
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.block,
    padding: layout.block,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceSunken,
  },
  statusText: {
    flex: 1,
    gap: layout.line,
  },
  // The countdown's window: the ring and its words over the slide, on the
  // task rows' grey, the slide's track set into it in the page's white.
  window: {
    gap: layout.block,
    padding: layout.block,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceSunken,
  },
  windowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.block,
  },
  windowSlide: {
    backgroundColor: colors.surface,
  },
  // Figures that hold their width, so the clock doesn't shuffle sideways
  // as it ticks.
  ringClock: {
    fontVariant: ['tabular-nums'],
  },
  // The caption's field with your face at its head, the way a comment's
  // composer opens on its author — on the same grey, rounded to a card
  // since it runs to a few lines.
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: layout.inline,
    padding: layout.block,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceSunken,
  },
  // `body`, the size and cut a post's caption reads in once it's up; its
  // first line level with the middle of the face beside it.
  captionInput: {
    flex: 1,
    fontFamily: type.body.fontFamily,
    fontSize: type.body.fontSize,
    lineHeight: type.body.lineHeight,
    letterSpacing: type.body.letterSpacing,
    color: colors.ink,
    padding: 0,
    paddingTop: (COMPOSER_AVATAR - type.body.lineHeight) / 2,
    minHeight: CAPTION_MIN_HEIGHT,
    textAlignVertical: 'top',
  },
  // On the page, as it reads under the post on Community — in from the
  // edge as far as the status row's own text, so the two line up.
  postedCaption: {
    paddingHorizontal: layout.block,
  },
  postedActions: {
    flexDirection: 'row',
    gap: layout.stack,
  },
  postedAction: {
    flex: 1,
    justifyContent: 'center',
  },
  ring: {
    width: RING,
    height: RING,
    alignItems: 'center',
    justifyContent: 'center',
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
