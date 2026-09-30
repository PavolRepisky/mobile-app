import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AlertDialog } from '@/components/AlertDialog';
import { CameraSheet } from '@/components/CameraSheet';
import { CheckCircle } from '@/components/CheckCircle';
import { DayStamp } from '@/components/FriendCard';
import { IconButton, cornerButtonSize, cornerIconSize } from '@/components/IconButton';
import { PhotoCollage } from '@/components/PhotoCollage';
import { Placeholder } from '@/components/Placeholder';
import { PopoverMenu } from '@/components/PopoverMenu';
import { ReminderPill } from '@/components/ReminderPill';
import { ScreenScroll } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Text } from '@/components/Text';
import { colors, layout, radii } from '@/constants/theme';
import {
  DEFAULT_LAST_CALL,
  DEFAULT_TASK_REMINDER,
  useApp,
  useDayProgress,
} from '@/hooks/useAppState';
import { timeLeftToday } from '@/lib/format';

/**
 * The day as the post it's building: today's photos already sit in the
 * square they'll be posted in, and every open square is a light tile with a
 * camera. Tapping one raises the camera card over the page, any open task a
 * swipe away, and the shot drops into the square that was tapped, so the
 * post comes out laid the way its owner chose.
 *
 * Under the post, the day's tasks themselves — each with its note and its
 * reminder while it's open, your shot and the time once it's done — then the
 * last call. The tasks keep no order:
 * nothing is "next", any of them can be done first.
 */

/** The lives, drawn small enough to sit on the status line's own height. */
const HEART = 14;
/** A done task's shot in its row — the reminder step's task photo size. */
const ROW_PHOTO = 44;
/** An open task's empty ring, centred in the column the done rows' shots
 * use, so the names line up down the list whether a task is done or not. */
const OPEN_RING = 26;
const OPEN_RING_BORDER = 2;
/** A done row's tick, a step under the ring it replaces. */
const ROW_TICK = 24;
/** The hairline between rows, as on the reminder step. */
const ROW_RULE = 1;

export default function TasksScreen() {
  const router = useRouter();
  const {
    currentDay,
    totalDays,
    challenge,
    tasks,
    livesLeft,
    livesTotal,
    reminders,
    setReminders,
    undoTask,
    completeTaskWithPhoto,
  } = useApp();

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

  const reminderFor = (taskId: string) =>
    taskId in reminders.tasks ? reminders.tasks[taskId] : DEFAULT_TASK_REMINDER;
  const setReminderFor = (taskId: string, at: number | null) =>
    setReminders({ ...reminders, tasks: { ...reminders.tasks, [taskId]: at } });

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

  const [menuOpen, setMenuOpen] = useState(false);
  const [restartOpen, setRestartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  /** The done task whose photo was tapped, and on which day, waiting on
   * undo-or-cancel. */
  const [doneFor, setDoneFor] = useState<{ taskId: string; day: number } | null>(null);

  return (
    <>
      <ScreenScroll
        tabBar
        header={
          <ScreenHeader
            plainTitle="Tasks"
            showBack={false}
            right={
              <IconButton
                name="ellipsis-horizontal"
                size={cornerButtonSize}
                iconSize={cornerIconSize}
                background={colors.surface}
                onPress={() => setMenuOpen(true)}
                accessibilityLabel="Challenge options"
              />
            }
          />
        }
      >
        {/* Which challenge these are the tasks of — the tab is shared by
            whatever you've joined, so it says so before anything else. */}
        <Text variant="itemTitle" numberOfLines={1}>
          {challenge.name}
        </Text>

        {/* Where the day stands, in one line: the count, then the clock in
            ink since it's the part that changes what to do next; the lives
            left sit at the far end. */}
        <View style={styles.status}>
          <Text variant="meta" color={colors.inkMuted} style={styles.statusText} numberOfLines={1}>
            {`Day ${currentDay} of ${totalDays} · `}
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

        <PhotoCollage
          style={styles.post}
          radius={0}
          cells={rows.map((row, slot) => ({
            key: row.task.id,
            label: row.task.label,
            photo: row.photo,
            seed: row.photoSeed,
            time: row.time,
            onPress: row.done
              ? () => setDoneFor({ taskId: row.task.id, day: currentDay })
              : () => setShooting({ slot, taskId: row.task.id }),
          }))}
        >
          {/* Once the last square is in, the post is stamped the way it goes
              up on Community. */}
          {allDone ? <DayStamp day={currentDay} kicker={challenge.name} /> : null}
        </PhotoCollage>

        <View style={styles.heading}>
          <Text variant="itemTitle">Today</Text>
          <Text variant="meta" color={colors.inkMuted}>
            {allDone ? `All ${rows.length} in` : `any order · ${openRows.length} open`}
          </Text>
        </View>
        <View>
          {[...openRows, ...doneRows].map((row, i) => (
            // The pill is a button of its own, so it sits beside the row's
            // tap area rather than inside it.
            <View key={row.task.id} style={[styles.row, i > 0 && styles.rowRule]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  row.done
                    ? `${row.task.label}, done at ${row.time}. Undo`
                    : `${row.task.label}. Take its photo`
                }
                onPress={
                  row.done
                    ? () => setDoneFor({ taskId: row.task.id, day: currentDay })
                    : () => setShooting({ slot: firstFreeSlot, taskId: row.task.id })
                }
                style={({ pressed }) => [styles.rowTap, pressed && styles.pressed]}
              >
                {/* No photo until there's a shot: an open task is an empty
                    ring, a done one shows what you took. */}
                <View style={styles.rowLead}>
                  {!row.done ? (
                    <View style={styles.openRing} />
                  ) : row.photo ? (
                    <Image source={row.photo} style={styles.rowPhoto} contentFit="cover" />
                  ) : (
                    <Placeholder
                      seed={row.photoSeed ?? row.task.id}
                      radius={radii.sm}
                      style={styles.rowPhoto}
                    />
                  )}
                </View>
                <View style={styles.rowText}>
                  <Text variant="copy">{row.task.label}</Text>
                  {row.task.note ? (
                    <Text variant="meta" color={colors.inkMuted}>
                      {row.task.note}
                    </Text>
                  ) : null}
                </View>
                {row.done ? (
                  <View style={styles.rowDone}>
                    <CheckCircle size={ROW_TICK} />
                    <Text variant="badge" color={colors.inkMuted}>
                      {row.time}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
              {!row.done ? (
                <ReminderPill
                  value={reminderFor(row.task.id)}
                  onChange={(at) => setReminderFor(row.task.id, at)}
                  title={row.task.label}
                  fallback={DEFAULT_TASK_REMINDER}
                />
              ) : null}
            </View>
          ))}
        </View>

        {/* The one nudge that isn't tied to a task, shown while one is still
            open: it only comes when the day is about to cost a life. */}
        {!allDone ? (
          <View style={styles.lastCall}>
            <View style={styles.rowText}>
              <Text variant="copyBold">Last call</Text>
              <Text variant="meta" color={colors.inkMuted}>
                Only if a task is still missing, so you don't lose a life.
              </Text>
            </View>
            <ReminderPill
              value={reminders.lastCall}
              onChange={(at) => setReminders({ ...reminders, lastCall: at })}
              title="Last call"
              fallback={DEFAULT_LAST_CALL}
              onFill
            />
          </View>
        ) : null}
      </ScreenScroll>

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
  // Tucked under the challenge's name as its second line.
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.inline,
    marginTop: layout.line,
  },
  statusText: {
    flex: 1,
  },
  hearts: {
    flexDirection: 'row',
    gap: layout.line / 2,
  },
  // Edge to edge with square corners, the way a post sits on Community, so
  // today's grid already reads as the post it's about to become.
  post: {
    marginTop: layout.heading,
    marginHorizontal: -layout.gutter,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: layout.section,
    marginBottom: layout.stack,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.inline,
    paddingVertical: layout.inline,
  },
  rowTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.inline,
  },
  rowRule: {
    borderTopWidth: ROW_RULE,
    borderTopColor: colors.surfaceSunken,
  },
  rowLead: {
    width: ROW_PHOTO,
    alignItems: 'center',
  },
  openRing: {
    width: OPEN_RING,
    height: OPEN_RING,
    borderRadius: radii.pill,
    borderWidth: OPEN_RING_BORDER,
    borderColor: colors.inkGhost,
  },
  rowPhoto: {
    width: ROW_PHOTO,
    height: ROW_PHOTO,
    borderRadius: radii.sm,
  },
  rowText: {
    flex: 1,
    gap: layout.line / 2,
  },
  rowDone: {
    alignItems: 'flex-end',
    gap: layout.line,
  },
  // Dims the whole row on press, the way a Settings row answers a tap.
  pressed: {
    opacity: 0.6,
  },
  // The reminder step's own last-call card: the fill grey, with its pill
  // turned white to stand off it.
  lastCall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.inline,
    marginTop: layout.heading,
    padding: layout.card,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceSunken,
  },
});
