import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AlertDialog } from '@/components/AlertDialog';
import { CameraSheet } from '@/components/CameraSheet';
import { ChallengeRun, type RunDay } from '@/components/ChallengeRun';
import { CheckCircle } from '@/components/CheckCircle';
import { EmptyState } from '@/components/EmptyState';
import { DayStamp } from '@/components/FriendCard';
import { PhotoCollage } from '@/components/PhotoCollage';
import { Placeholder } from '@/components/Placeholder';
import { ScreenScroll } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StepBar } from '@/components/StepBar';
import { Text } from '@/components/Text';
import { colors, layout, radii, shadows } from '@/constants/theme';
import {
  useApp,
  useDayProgress,
} from '@/hooks/useAppState';
import { longDate, timeLeftToday } from '@/lib/format';

/**
 * The run you're on leads, one square a day on a block of ink. Then the
 * day's tasks as a to-do list: each open one a ring and its note, each done
 * one ticked with the time. When each one nudges
 * you is set in Settings, off My Profile, so the page is only the doing. Tapping a
 * task raises the camera card over the page, any open task a swipe away. The
 * tasks keep no order: nothing is "next", any of them can be done first.
 *
 * Between the run and the tasks, the post the photos are building, folded
 * to one line with a thumbnail of it and where today stands. Tapped, it
 * opens in a window over the page as the post will go up — every shot in its
 * square, the Day stamp once the last one is in.
 *
 * Joined but before Day 1 — where joining almost always leaves you, since it
 * shuts once a round starts — the run waits with every square to come, a
 * line says when it begins, and the tasks are there to read but not to
 * shoot yet. Not in a challenge at all, the page points to the Challenges
 * tab instead.
 */

/** The lives, drawn small enough to sit on the post line's own height. */
const HEART = 14;
/** A task's ring, and the tick that fills it once it's done: big enough to
 * lead its row and to hit with a thumb. */
const ROW_TICK = 32;
/** The rule between tasks — one hairline of the fill grey, enough to part
 * the rows without boxing any of them in. */
const ROW_RULE = 1;
/** What closes a row: the camera on an open task, a thumb's target in ink,
 * and on a done one the shot you took, the same size so the rows line up. */
const ROW_END = 44;
const SHOOT_ICON = 20;
/** The folded post's glimpse of itself — the post window's grid in small,
 * big enough that its five squares, open ones included, can still be told
 * apart. */
const POST_THUMB = 64;
const POST_CHEVRON = 20;

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
  // A task tapped in the list has no square of its own yet, so its shot
  // takes the first one still open.
  const firstFreeSlot = rows.findIndex((row) => !row.done);

  // The same rows in the challenge's own list order, done or not: a task
  // keeps its place when it's ticked, the way a to-do list does.
  const listed = tasks.flatMap((task) => rows.filter((row) => row.task.id === task.id));
  const openRows = listed.filter((row) => !row.done);


  // The countdown only needs the minute, so it ticks once a minute.
  const [now, setNow] = useState(() => new Date());
  // The day closes at midnight, so past eleven the clock is the whole story.
  const lastHour = now.getHours() >= 23;
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

  if (!inChallenge) {
    return (
      <ScreenScroll tabBar header={<ScreenHeader plainTitle="Tasks" showBack={false} />}>
        {loadFailed ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="Couldn’t load your challenge"
            hint="Check your connection and try again."
            action={{ label: 'Try again', onPress: () => reload() }}
          />
        ) : (
          <EmptyState
            icon="camera-outline"
            title="No challenge yet"
            hint="Join one and its daily tasks show up here, ready to photograph."
            action={{ label: 'Find a challenge', onPress: () => router.navigate('/discover') }}
          />
        )}
      </ScreenScroll>
    );
  }

  return (
    <>
      <ScreenScroll
        tabBar
        contentContainerStyle={styles.content}
        header={
          <ScreenHeader plainTitle="Tasks" showBack={false} />
        }
      >
        {/* Which challenge these are the tasks of — the tab is shared by
            whatever you've joined — as the whole run so far. */}
        <ChallengeRun
          challenge={challenge}
          startDate={startDate}
          currentDay={waiting ? 0 : currentDay}
          totalDays={totalDays}
          taskCount={tasks.length}
          dayOf={runDay}
        />

        {waiting ? (
          // Nothing to post before Day 1 — just when it comes.
          <View style={[styles.postCard, styles.waitingCard]}>
            <View style={styles.taskText}>
              <Text variant="copyBold">
                {daysUntilStart === 1 ? 'Starts tomorrow' : `Starts in ${daysUntilStart} days`}
              </Text>
              <Text variant="meta" color={colors.inkMuted}>
                {`Day 1 is ${longDate(startDate)}. Your first photos go up then.`}
              </Text>
            </View>
          </View>
        ) : allDone ? (
          // The day done: the post opens out across the page as it went up,
          // stamped, so finishing lands as the moment it is rather than one
          // more line ticked.
          <View style={styles.finished}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Your Day ${currentDay} post. Open`}
              onPress={() => setPostOpen(true)}
              style={({ pressed }) => pressed && styles.pressed}
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
                <DayStamp day={currentDay} kicker={challenge.name} />
              </PhotoCollage>
            </Pressable>
            <View style={styles.status}>
              <View style={styles.statusText}>
                <Text variant="itemTitle">Day {currentDay} done</Text>
                <Text variant="meta" color={colors.inkMuted}>
                  Posted to Community
                </Text>
              </View>
              <View style={styles.hearts}>
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
          </View>
        ) : (
          // Today's post heads the day: what the photos are building, a
          // glance at it, where today stands — the count, then the clock in
          // ink since it's the part that changes what to do next, the lives
          // at the far end, and the accent filling a segment a photo — and a
          // tap to see it as it will go up.
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Your Day ${currentDay} post, ${done} of ${rows.length} photos, ${livesLeft} of ${livesTotal} lives left. Open`}
            onPress={() => setPostOpen(true)}
            style={({ pressed }) => [styles.postCard, pressed && styles.pressed]}
          >
            <PhotoCollage
              bare
              radius={radii.sm}
              style={styles.postThumb}
              cells={rows.map((row) => ({
                key: row.task.id,
                photo: row.thumb ?? row.photo,
                seed: row.photoSeed,
              }))}
            />
            <View style={styles.taskText}>
              <Text variant="copyBold">Your Day {currentDay} post</Text>
              <View style={styles.status}>
                <Text variant="meta" color={colors.inkMuted} style={styles.statusText} numberOfLines={1}>
                  {`${done} of ${rows.length} · `}
                  {/* The last hour steps up a weight and says so — in ink, not
                      the red, which is kept for what can't be undone. */}
                  <Text variant={lastHour ? 'metaBold' : 'meta'}>
                    {`${timeLeftToday(now)} left${lastHour ? ' · last hour' : ''}`}
                  </Text>
                </Text>
                <View style={styles.hearts}>
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
              <StepBar accent step={done} total={rows.length} style={styles.postBar} />
            </View>
            <Ionicons name="chevron-forward" size={POST_CHEVRON} color={colors.inkMuted} />
          </Pressable>
        )}

        <View style={styles.heading}>
          <Text variant="sectionHeading">{waiting ? 'Every day' : 'Today'}</Text>
        </View>

        {/* The tasks as a plain to-do list on the page: a ring to tick, the
            name and its note under it, the camera at the end, a hairline
            between rows. Ticked, the ring fills in ink, the note gives way
            to when it was done and the camera to the shot you took.
            Tapping an open one raises the camera for its photo; a done one
            offers to undo it. */}
        <View>
          {listed.map((row, index) => (
            <Pressable
              key={row.task.id}
              // Mid-upload a row waits for its save to land, so an undo can
              // never reach the server ahead of the photo it would remove.
              disabled={waiting || row.pending}
              accessibilityRole="button"
              accessibilityLabel={
                row.done
                  ? `${row.task.label}, done${row.time ? ` at ${row.time}` : ''}. Undo`
                  : `${row.task.label}. Take its photo`
              }
              onPress={() =>
                row.done
                  ? setDoneFor({ taskId: row.task.id, day: currentDay })
                  : setShooting({ slot: firstFreeSlot, taskId: row.task.id })
              }
              style={({ pressed }) => [
                styles.taskRow,
                index > 0 && styles.taskRule,
                pressed && styles.pressed,
              ]}
            >
              <CheckCircle empty={!row.done} size={ROW_TICK} />
              <View style={styles.taskText}>
                <Text variant="copy">{row.task.label}</Text>
                {row.done ? (
                  <Text variant="meta" color={colors.inkMuted}>
                    {row.pending ? 'Saving…' : row.time ? `Done ${row.time}` : 'Done'}
                  </Text>
                ) : row.task.note ? (
                  <Text variant="meta" color={colors.inkMuted}>
                    {row.task.note}
                  </Text>
                ) : null}
              </View>
              {waiting ? null : row.done ? (
                row.photo ? (
                  <Image source={row.thumb ?? row.photo} style={styles.rowEnd} contentFit="cover" />
                ) : (
                  <Placeholder
                    seed={row.photoSeed ?? row.task.id}
                    radius={radii.sm}
                    style={styles.rowEnd}
                  />
                )
              ) : (
                <View style={styles.shoot}>
                  <Ionicons name="camera" size={SHOOT_ICON} color={colors.inkInverse} />
                </View>
              )}
            </Pressable>
          ))}
        </View>

      </ScreenScroll>

      {/* The post on its own, in a window over the page: only to look at —
          the shots are taken and undone from the task list, so it never has
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
        tasks={openRows.map((row) => ({ id: row.task.id, label: row.task.label, note: row.task.note }))}
        taskId={shooting?.taskId ?? null}
        kicker={`Day ${currentDay} · ${openRows.length} left`}
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
  // The run card starts right under the header bar's own gap, without the
  // title's gap on top of it: the card's ink edge already parts it from
  // the title, so the extra space only read as empty.
  content: {
    paddingTop: 0,
  },
  // The post's second line: where today stands, lives at its far end.
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.inline,
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
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.block,
    paddingVertical: layout.block,
  },
  shoot: {
    width: ROW_END,
    height: ROW_END,
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowEnd: {
    width: ROW_END,
    height: ROW_END,
    borderRadius: radii.sm,
  },
  taskRule: {
    borderTopWidth: ROW_RULE,
    borderTopColor: colors.surfaceSunken,
  },
  taskText: {
    flex: 1,
    gap: layout.line,
  },
  // White and resting on the page rather than outlined — a hairline read as
  // a drawn box — and not the fill grey, which the thumbnail's grey open
  // squares would melt into.
  postCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.inline,
    marginTop: layout.heading,
    padding: layout.stack,
    paddingRight: layout.card,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  postThumb: {
    width: POST_THUMB,
  },
  // Only words in it, so it takes the card's own padding all round rather
  // than the thumbnail's tighter inset.
  waitingCard: {
    padding: layout.card,
  },
  postBar: {
    marginTop: layout.line,
  },
  finished: {
    marginTop: layout.heading,
    gap: layout.block,
  },
  // Dims a card on press, the way a Settings row answers a tap.
  pressed: {
    opacity: 0.6,
  },
});
