import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AlertDialog } from '@/components/AlertDialog';
import { CameraSheet } from '@/components/CameraSheet';
import { ChallengeRun, type RunDay } from '@/components/ChallengeRun';
import { CheckCircle } from '@/components/CheckCircle';
import { DayStamp } from '@/components/FriendCard';
import { PhotoCollage } from '@/components/PhotoCollage';
import { Placeholder } from '@/components/Placeholder';
import { ScreenScroll } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Text } from '@/components/Text';
import { colors, layout, radii } from '@/constants/theme';
import {
  useApp,
  useDayProgress,
} from '@/hooks/useAppState';
import { timeLeftToday } from '@/lib/format';

/**
 * The run you're on leads, one square a day on a block of ink, with where
 * today stands under it. Then the day's tasks, first and biggest: each open one a card with its note
 * and a camera, each done one your shot and the time. When each one nudges
 * you is set in Settings, off My Profile, so the page is only the doing. Tapping a
 * task raises the camera card over the page, any open task a swipe away. The
 * tasks keep no order: nothing is "next", any of them can be done first.
 *
 * Under them, the post the photos are building, folded to one line with a
 * thumbnail of it. Tapped, it opens in a window over the page as the post
 * will go up — every shot in its square, the Day stamp once the last one is
 * in.
 */

/** The lives, drawn small enough to sit on the status line's own height. */
const HEART = 14;
/** A done task's shot in its card — big enough to tell which photo it was. */
const DONE_PHOTO = 52;
/** A done card's tick. */
const ROW_TICK = 24;
/** The camera on an open task: the card's one call to act, a full thumb's
 * target in ink so it reads before the words do. */
const SHOOT = 52;
const SHOOT_ICON = 22;
/** The folded post's glimpse of itself — the week row's little posts, a
 * size up so the squares can still be told apart. */
const POST_THUMB = 56;
const POST_CHEVRON = 20;
/** The folded post's outline — the hairline the old rows were ruled with. */
const POST_RULE = 1;

export default function TasksScreen() {
  const router = useRouter();
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
  } = useApp();

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
  // A task tapped in the list has no square of its own yet, so its shot
  // takes the first one still open.
  const firstFreeSlot = rows.findIndex((row) => !row.done);

  // The same rows in the challenge's own list order, open ones first: a
  // grouping by what's left, not an order to do them in.
  const listed = tasks.flatMap((task) => rows.filter((row) => row.task.id === task.id));
  const openRows = listed.filter((row) => !row.done);
  const doneRows = listed.filter((row) => row.done);


  // The countdown only needs the minute, so it ticks once a minute.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  /** The square the camera card is filling and the task picked for it;
   * null while the card is down. */
  const [shooting, setShooting] = useState<{ slot: number; taskId: string } | null>(null);
  useEffect(() => setShooting(null), [currentDay]);

  /** The done task whose photo was tapped, and on which day, waiting on
   * undo-or-cancel. */
  const [doneFor, setDoneFor] = useState<{ taskId: string; day: number } | null>(null);
  /** Today's post, opened in its window to show how it will look. */
  const [postOpen, setPostOpen] = useState(false);

  return (
    <>
      <ScreenScroll
        tabBar
        header={
          <ScreenHeader plainTitle="Tasks" showBack={false} />
        }
      >
        {/* Which challenge these are the tasks of — the tab is shared by
            whatever you've joined — as the whole run so far, and a way into
            its page. */}
        <ChallengeRun
          challenge={challenge}
          startDate={startDate}
          currentDay={currentDay}
          totalDays={totalDays}
          taskCount={tasks.length}
          dayOf={runDay}
          onPress={() => router.push({ pathname: '/feed/[id]', params: { id: challenge.id } })}
        />

        {/* Where today stands, in one line: the count, then the clock in
            ink since it's the part that changes what to do next; the lives
            left sit at the far end. */}
        <View style={styles.status}>
          <Text variant="meta" color={colors.inkMuted} style={styles.statusText} numberOfLines={1}>
            {allDone ? (
              <Text variant="meta">Posted</Text>
            ) : (
              <>
                {`${done} of ${rows.length} in · `}
                <Text variant="meta">{`${timeLeftToday(now)} left`}</Text>
              </>
            )}
          </Text>
          <View style={styles.hearts} accessibilityLabel={`${livesLeft} of ${livesTotal} lives left`}>
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

        <View style={styles.heading}>
          <Text variant="sectionHeading">Today</Text>
          <Text variant="meta" color={colors.inkMuted}>
            {allDone ? `All ${rows.length} in` : `any order · ${openRows.length} open`}
          </Text>
        </View>

        {/* The tasks lead the page, each its own card: the name big, the
            note under it and the camera in ink beside it, so what's left to
            do today is the first thing read. */}
        <View style={styles.tasks}>
          {openRows.map((row) => (
            <Pressable
              key={row.task.id}
              accessibilityRole="button"
              accessibilityLabel={`${row.task.label}. Take its photo`}
              onPress={() => setShooting({ slot: firstFreeSlot, taskId: row.task.id })}
              style={({ pressed }) => [styles.task, styles.taskRow, pressed && styles.pressed]}
            >
              <View style={styles.taskText}>
                <Text variant="itemTitle">{row.task.label}</Text>
                {row.task.note ? (
                  <Text variant="meta" color={colors.inkMuted}>
                    {row.task.note}
                  </Text>
                ) : null}
              </View>
              <View style={styles.shoot}>
                <Ionicons name="camera" size={SHOOT_ICON} color={colors.inkInverse} />
              </View>
            </Pressable>
          ))}

          {/* Done, a task keeps its card but gives up the camera for the
              shot you took, so the open ones above still pull the eye. */}
          {doneRows.map((row) => (
            <Pressable
              key={row.task.id}
              accessibilityRole="button"
              accessibilityLabel={`${row.task.label}, done at ${row.time}. Undo`}
              onPress={() => setDoneFor({ taskId: row.task.id, day: currentDay })}
              style={({ pressed }) => [styles.task, styles.taskRow, pressed && styles.pressed]}
            >
              {row.photo ? (
                <Image source={row.photo} style={styles.donePhoto} contentFit="cover" />
              ) : (
                <Placeholder
                  seed={row.photoSeed ?? row.task.id}
                  radius={radii.sm}
                  style={styles.donePhoto}
                />
              )}
              <View style={styles.taskText}>
                <Text variant="copyBold">{row.task.label}</Text>
                <Text variant="meta" color={colors.inkMuted}>
                  {row.time ? `Done at ${row.time}` : 'Done'}
                </Text>
              </View>
              <CheckCircle size={ROW_TICK} />
            </Pressable>
          ))}
        </View>

        {/* Today's post, folded down to a line: what the photos are
            building, a glance at it, and a tap to see it as it will go up. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Your Day ${currentDay} post, ${done} of ${rows.length} photos. Open`}
          onPress={() => setPostOpen(true)}
          style={({ pressed }) => [styles.postCard, pressed && styles.pressed]}
        >
          <PhotoCollage
            bare
            radius={radii.sm}
            style={styles.postThumb}
            cells={rows.map((row) => ({
              key: row.task.id,
              photo: row.photo,
              seed: row.photoSeed,
            }))}
          />
          <View style={styles.taskText}>
            <Text variant="copyBold">Your Day {currentDay} post</Text>
            <Text variant="meta" color={colors.inkMuted}>
              {allDone
                ? 'Posted to Community'
                : `${done} of ${rows.length} photos · goes up at ${rows.length}/${rows.length}`}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={POST_CHEVRON} color={colors.inkMuted} />
        </Pressable>

      </ScreenScroll>

      {/* The post on its own, in a window over the page: only to look at —
          the shots are taken and undone from the task cards, so it never has
          to hand over to the camera's own sheet mid-close. */}
      <AlertDialog
        visible={postOpen}
        title={`Your Day ${currentDay} post`}
        message={
          allDone
            ? 'Posted to Community'
            : `${done} of ${rows.length} photos · goes up when all are in`
        }
        onDismiss={() => setPostOpen(false)}
        actions={[{ label: 'Close', onPress: () => setPostOpen(false) }]}
      >
        <PhotoCollage
          cells={rows.map((row) => ({
            key: row.task.id,
            label: row.task.label,
            photo: row.photo,
            seed: row.photoSeed,
            time: row.time,
          }))}
        >
          {/* Once the last square is in, the post is stamped the way it goes
              up on Community. */}
          {allDone ? <DayStamp day={currentDay} kicker={challenge.name} /> : null}
        </PhotoCollage>
      </AlertDialog>

      <CameraSheet
        visible={shooting !== null}
        tasks={rows.filter((row) => !row.done).map((row) => ({ id: row.task.id, label: row.task.label }))}
        taskId={shooting?.taskId ?? null}
        // Any open task can go in the tapped square, not only the one it
        // suggested — swiping through them is how the owner lays out their
        // own post.
        swipeTasks
        onChangeTask={(taskId) => setShooting((open) => (open ? { ...open, taskId } : open))}
        onCapture={(taskId, photo) => {
          completeTaskWithPhoto(taskId, photo, undefined, shooting?.slot);
          setShooting(null);
        }}
        onClose={() => setShooting(null)}
      />

      <AlertDialog
        visible={doneFor !== null}
        title="Undo Task"
        message={
          doneFor?.day === currentDay
            ? "This removes today's photo too — you can shoot it again from the grid afterwards."
            : 'This removes the photo from that day too.'
        }
        onDismiss={() => setDoneFor(null)}
        actions={[
          { label: 'Cancel', onPress: () => setDoneFor(null) },
          {
            label: 'Undo Task',
            destructive: true,
            onPress: () => {
              if (doneFor) undoTask(doneFor.taskId, doneFor.day);
              setDoneFor(null);
            },
          },
        ]}
      />

    </>
  );
}

const styles = StyleSheet.create({
  // Under the run card, today's part of it.
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.inline,
    marginTop: layout.heading,
  },
  statusText: {
    flex: 1,
  },
  hearts: {
    flexDirection: 'row',
    gap: layout.line / 2,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: layout.title,
    marginBottom: layout.heading,
  },
  tasks: {
    gap: layout.stack,
  },
  task: {
    padding: layout.card,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceSunken,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.inline,
  },
  taskText: {
    flex: 1,
    gap: layout.line,
  },
  shoot: {
    width: SHOOT,
    height: SHOOT,
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donePhoto: {
    width: DONE_PHOTO,
    height: DONE_PHOTO,
    borderRadius: radii.sm,
  },
  // Outlined rather than filled, so it reads as a step back from the task
  // cards above it rather than one more of them.
  postCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.inline,
    marginTop: layout.section,
    padding: layout.stack,
    paddingRight: layout.card,
    borderRadius: radii.lg,
    borderWidth: POST_RULE,
    borderColor: colors.surfaceSunken,
  },
  postThumb: {
    width: POST_THUMB,
  },
  // Dims a card on press, the way a Settings row answers a tap.
  pressed: {
    opacity: 0.6,
  },
});
