import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View, type LayoutRectangle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlertDialog } from '@/components/AlertDialog';
import { PhotoCollage } from '@/components/PhotoCollage';
import { PopoverMenu } from '@/components/PopoverMenu';
import { profileActionHeight, profileActionTop } from '@/components/ProfileLayout';
import { Screen, topPadding } from '@/components/Screen';
import { TaskCameraGrid } from '@/components/TaskCameraGrid';
import { Text } from '@/components/Text';
import { WeekTracker, type WeekCellStatus } from '@/components/WeekTracker';
import { colors, radii, screenPadding, spacing } from '@/constants/theme';
import { useApp, useDayProgress } from '@/hooks/useAppState';
import { addDays } from '@/lib/format';

/**
 * The day opens on the calm mosaic block the calendar's own day cells cut
 * theirs — photos merged edge to edge behind a hairline seam, the same cut
 * the live camera grid's own tiles draw — with an open task's tile inviting
 * a tap. That tap is the only way into the live camera grid, where every
 * other open task sits over the viewfinder as a frosted, labelled tile until
 * it is shot; closing the camera, or finishing the last task, drops back to
 * the calm view.
 */

/** The black seam between the mosaic's photos, and round its outer edge —
 * half the collage's default. At full ink, the default two read as a heavy
 * drawn grid over the prints; one keeps the cut without the weight. */
const GRID_SEAM = 1;

/** The same bare settings glyph My Profile's header carries, at the same
 * size, rather than a circular IconButton of its own. */
const settingsIconSize = 26;
/** The outline glyph has no bold cut of its own — stacking a second copy a
 * hair off the first thickens the stroke without switching to the filled
 * icon, exactly as Profile does. */
const settingsBoldOffset = 0.6;

/** The carousel's page dots — the same 6px marks the multi-photo posts use. */
const PAGE_DOT = 6;

export default function TasksScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentDay, startDate, totalDays, tasks, progress, undoTask, completeTaskWithPhoto } =
    useApp();

  // The page is today and nothing else: with the tick scrubber gone there is
  // no way to park on another day, so the grid reads off the current one.
  const rows = useDayProgress(currentDay);
  const done = rows.filter((row) => row.done).length;
  const allDone = rows.length > 0 && done === rows.length;

  /**
   * This calendar week, Monday first, read off the challenge's own progress.
   * Each weekday is turned back into a challenge day by counting from the
   * start date, so a week straddling the start or the end simply leaves
   * those columns blank rather than inventing days either side.
   */
  const { weekDays, weekRows, todayIndex } = useMemo(() => {
    const today = addDays(startDate, currentDay - 1);
    const offset = (today.getDay() + 6) % 7;
    const days = Array.from({ length: 7 }, (_, i) => currentDay - offset + i);
    return {
      weekDays: days,
      todayIndex: offset,
      weekRows: tasks.map((task) => ({
        id: task.id,
        label: task.label,
        days: days.map((day): WeekCellStatus => {
          if (day < 1 || day > totalDays) return 'outside';
          if (progress[day]?.[task.id]?.done) return 'done';
          if (day === currentDay) return 'today';
          return day < currentDay ? 'missed' : 'future';
        }),
      })),
    };
  }, [startDate, currentDay, totalDays, tasks, progress]);

  /**
   * The grid pages sideways through this week's days, one mosaic a page —
   * only the days the challenge actually covers, so a week straddling its
   * start or end has no blank pages for days that were never part of it.
   * It opens on today, and the tracker's weekday header follows whichever
   * page is showing.
   */
  const pages = useMemo(
    () =>
      weekDays
        .map((day, weekIndex) => ({ day, weekIndex }))
        .filter(({ day }) => day >= 1 && day <= totalDays),
    [weekDays, totalDays],
  );
  const todayPage = Math.max(0, pages.findIndex((page) => page.day === currentDay));
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(todayIndex);
  const selectedPage = Math.max(
    0,
    pages.findIndex((page) => page.weekIndex === selectedWeekIndex),
  );
  const carousel = useRef<FlatList<(typeof pages)[number]>>(null);
  // A new day starts back on today's page rather than wherever the last one
  // was left.
  useEffect(() => setSelectedWeekIndex(todayIndex), [currentDay, todayIndex]);

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

  /**
   * The space the calm mosaic leaves for its grid once the heading above it
   * has taken its own room. Only the calm view needs this — the live camera
   * grid is full-bleed and has no ratio to work out.
   */
  const [gridBox, setGridBox] = useState<LayoutRectangle | null>(null);
  const gridWidth = gridBox ? gridBox.width - screenPadding * 2 : 0;
  const gridRatio = gridWidth > 0 && gridBox ? gridBox.height / gridWidth : 1;

  const [menuOpen, setMenuOpen] = useState(false);
  const [restartOpen, setRestartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  /** The done task whose photo was tapped, and on which day, waiting on
   * undo-or-cancel. */
  const [doneFor, setDoneFor] = useState<{ taskId: string; day: number } | null>(null);

  // Lines the title up on the same row every other tab root's corner button
  // sits on, the way Discover's and Calendar's own titles do.
  const headerTop = Math.max(profileActionTop, topPadding(insets.top));
  const titleOffset = headerTop - topPadding(insets.top);

  return (
    <>
      {showCamera ? (
        // Full-bleed and bare, the way `/photo/camera` already is — no day
        // heading, no settings menu, no tab bar. Restart/End/Change Challenge
        // stay reachable from the calm view's settings glyph below, not from here.
        <TaskCameraGrid
          day={currentDay}
          rows={rows}
          onCapture={completeTaskWithPhoto}
          onUndo={undoTask}
          onClose={() => setCameraDismissed(true)}
        />
      ) : (
        // Plain, centred title — the same header Discover and Calendar use —
        // naming what the page holds rather than an identity of its own. The
        // settings glyph is laid out the way My Profile lays out its own: a
        // spacer the glyph's width on the left so the title centres on the
        // page, not on what's left.
        <Screen padded={false} tabBar>
          <View style={[styles.titleBand, { marginTop: titleOffset }]}>
            <View style={styles.headerIconStack} />
            <Text variant="sectionTitle" center style={styles.headerTitle}>
              Tasks
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Challenge settings"
              onPress={() => setMenuOpen(true)}
              hitSlop={spacing.md}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <View style={styles.headerIconStack}>
                <Ionicons name="settings-outline" size={settingsIconSize} color={colors.ink} />
                <Ionicons
                  name="settings-outline"
                  size={settingsIconSize}
                  color={colors.ink}
                  style={styles.headerIconOverlay}
                />
              </View>
            </Pressable>
          </View>

          <WeekTracker
            rows={weekRows}
            todayIndex={todayIndex}
            selectedIndex={selectedWeekIndex}
            style={styles.tracker}
          />

          {/* The calm record: every task a tile in its own mosaic, the print
              itself standing in for the tick a row used to carry. Tapping a
              done tile offers to undo it; tapping an open one (closed out of
              the camera without finishing the day) drops straight back into
              the live grid. */}
          <View style={styles.gridArea}>
            <View style={styles.carousel} onLayout={(e) => setGridBox(e.nativeEvent.layout)}>
              {gridBox ? (
                <FlatList
                  ref={carousel}
                  // Re-keyed on the measured width so a relayout rebuilds the
                  // pages at their new size instead of scrolling mid-page.
                  key={gridBox.width}
                  data={pages}
                  keyExtractor={(page) => String(page.day)}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  initialScrollIndex={todayPage}
                  getItemLayout={(_, index) => ({
                    length: gridBox.width,
                    offset: gridBox.width * index,
                    index,
                  })}
                  // Follows the swipe as it happens rather than once it settles,
                  // so the dots and the tracker's weekday move with the finger.
                  scrollEventThrottle={16}
                  onScroll={(e) => {
                    const index = Math.round(e.nativeEvent.contentOffset.x / gridBox.width);
                    const page = pages[index];
                    if (page) setSelectedWeekIndex(page.weekIndex);
                  }}
                  renderItem={({ item: page }) => {
                    const isToday = page.day === currentDay;
                    const entries = progress[page.day] ?? {};
                    return (
                      <View style={{ width: gridBox.width, height: gridBox.height }}>
                        <PhotoCollage
                          layout="mosaic"
                          showLabels
                          // Barely rounded — the smallest cut in the scale, so
                          // the block reads as a contact sheet with its corners
                          // just eased rather than a card sitting on the page.
                          radius={radii.sm}
                          seam={GRID_SEAM}
                          ratio={gridRatio}
                          style={styles.grid}
                          cells={tasks.map((task) => {
                            const entry = entries[task.id];
                            const done = !!entry?.done;
                            return {
                              key: task.id,
                              label: task.label,
                              photo: entry?.photo,
                              seed: entry?.photoSeed,
                              time: entry?.time,
                              // A done tile offers to undo it on any day; an
                              // open one only opens the camera on today — a
                              // day gone by or still to come can't be shot now.
                              onPress: done
                                ? () => setDoneFor({ taskId: task.id, day: page.day })
                                : isToday
                                  ? () => setCameraDismissed(false)
                                  : undefined,
                            };
                          })}
                        />
                      </View>
                    );
                  }}
                />
              ) : null}
            </View>

            {/* The tell that the grid swipes: one dot a day, the one showing in
                ink. Under the grid on the page rather than riding the photos
                the way a post's dots do — the tiles' own labels already hold
                the bottom edge of the prints. */}
            {pages.length > 1 ? (
              <View style={styles.dots}>
                {pages.map((page, i) => (
                  <View
                    key={page.day}
                    style={[styles.dot, i === selectedPage && styles.dotActive]}
                  />
                ))}
              </View>
            ) : null}
          </View>
        </Screen>
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
  titleBand: {
    minHeight: profileActionHeight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: screenPadding,
  },
  headerTitle: {
    flex: 1,
  },
  headerIconStack: {
    width: settingsIconSize + settingsBoldOffset,
    height: settingsIconSize + settingsBoldOffset,
  },
  headerIconOverlay: {
    position: 'absolute',
    left: settingsBoldOffset,
    top: settingsBoldOffset,
  },
  pressed: {
    opacity: 0.85,
  },
  tracker: {
    marginTop: spacing.lg,
    paddingHorizontal: screenPadding,
  },
  gridArea: {
    flex: 1,
    // Clear of the tracker above it, and of the floating tab bar below —
    // both margins shrink `gridArea`'s own measured box, which the ratio
    // handed to the mosaic is worked out from, so the block itself ends up
    // that much short of full-bleed on each edge rather than crowding them.
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  carousel: {
    flex: 1,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  dot: {
    width: PAGE_DOT,
    height: PAGE_DOT,
    borderRadius: radii.pill,
    backgroundColor: colors.inkGhost,
  },
  dotActive: {
    backgroundColor: colors.ink,
  },
  grid: {
    // The tile hangs off the page's own gutter, the same one every other
    // screen hangs off. Subtracted by hand from `gridArea`'s own measured
    // width to work out the ratio the block is asked to fill — the two have
    // to agree on the same inset.
    paddingHorizontal: screenPadding,
  },
});
