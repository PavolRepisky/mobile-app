import {
  Button,
  HStack,
  Host,
  Image as SystemImage,
  Menu,
  Spacer,
  Text as SystemText,
} from '@expo/ui/swift-ui';
import {
  buttonStyle,
  disabled as disabledModifier,
  font,
  foregroundStyle,
} from '@expo/ui/swift-ui/modifiers';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  useColorScheme,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
  type ColorValue,
} from 'react-native';
import Svg, { Circle, Defs, G, Mask } from 'react-native-svg';

import { colors, colorsFor, layout, shadows, spacing } from '@/constants/theme';
import { shortDate } from '@/lib/format';
import { DAY_MS } from '@/lib/round';
import { quicksand } from '@/lib/swiftUI';
import { Avatar, type AvatarSource } from './Avatar';
import { BottomSheet } from './BottomSheet';
import { PrimaryButton } from './Buttons';
import { CalendarMonth, MONTH_NAMES, type CalendarDay } from './CalendarMonth';
import { EmptyState } from './EmptyState';
import { IconButton } from './IconButton';
import { DayStamp } from './FriendCard';
import { MosaicArrangement } from './PhotoCollage';
import { Pill } from './Pill';
import { Placeholder } from './Placeholder';
import { NATIVE_HEADER } from './Screen';
import { accentAt } from './TaskRing';
import { Text } from './Text';
import { WheelPicker } from './WheelPicker';

/** Kept out of the stylesheet because it is handed to `Image` as often as to
 * a `View`, and the two disagree about what a style is allowed to say —
 * the calendar's own day-cell mosaic does the same. */
const DAY_CELL_PIECE = { flex: 1 } as const;
/** No cut between a day's own photos — unlike the calendar's own mosaic,
 * the gap here belongs between whole day tiles, not the prints inside one. */
const DAY_CELL_SEAM = 0;
/** The days' two views, as the tabs that head them. */
const DAYS_TABS = [
  { key: 'grid', label: 'Grid', icon: 'grid-outline', symbol: 'square.grid.3x3' },
  { key: 'month', label: 'Month', icon: 'calendar-outline', symbol: 'calendar' },
] as const;
/** A tab's glyph, and the rule under the one on show — heavier than the
 * hairline under the row, so it reads as the marker. */
const TAB_GLYPH = 22;
const TAB_INDICATOR = 2;

/** The seam between day tiles: the Photos app's hairline of page between
 * square photos, so the days read as one wall of pictures. */
const PHOTO_GRID_SEAM = 2;

/** The month view's paging buttons: small grey discs grouped at the end of
 * the month's own row, the way the Days switch sits at the end of its row. */
const MONTH_ARROW_BUTTON = 36;
const MONTH_ARROW_ICON = 18;
/** The ▾ beside the month name, a step under the name's own cap height. */
const MONTH_CARET = 18;
/** Top margin that settles the caret onto the name's optical centre — see
 * `monthCaret` for where it was measured from. */
const MONTH_CARET_NUDGE = 1;
/** How far back the year picker reaches — far enough to look at the months
 * before the app. It stops at this year: there's nothing to see ahead. */
const YEARS_BACK = 5;

/** The chevron after the era's name — the size of the line it ends. */
const ERA_CHEVRON = 14;

/** The hero circle — the one place on a profile that gets to be that big. */
const avatarSize = 120;

/**
 * Today at a glance, drawn as a ring around the photo: one segment per task
 * in the challenge, filled clockwise from 12 o'clock as tasks get done — so
 * opening a profile says straight away how the day is going. A clear gap
 * between the ring and the photo keeps it reading as a gauge around the
 * avatar, not a coloured border on it.
 */
const RING_STROKE = 6;
const RING_GAP = 5;
const RING_SIZE = avatarSize + (RING_STROKE + RING_GAP) * 2;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
/** The visible gap between two segments, measured along the ring. */
const RING_SEGMENT_GAP = 7;

/**
 * One arc per task, each rotated into its own slot. Round caps grow every
 * arc by half a stroke at each end, so the drawn length gives that back to
 * keep the gaps the size they say. A single task is the whole circle, with
 * no gap to leave.
 */
function ringSegments(count: number): { length: number; rotation: number }[] {
  if (count <= 1) return [{ length: RING_CIRCUMFERENCE, rotation: -90 }];
  const slot = RING_CIRCUMFERENCE / count;
  const length = Math.max(0.01, slot - RING_SEGMENT_GAP - RING_STROKE);
  // Shifts each arc half a gap off its slot's edge, so the gap straddles
  // 12 o'clock rather than the first segment starting on it.
  const inset = (((RING_SEGMENT_GAP + RING_STROKE) / 2) / RING_CIRCUMFERENCE) * 360;
  return Array.from({ length: count }, (_, i) => ({
    length,
    rotation: -90 + (i * 360) / count + inset,
  }));
}

/** One arc of the ring, rotated into its slot. Round caps only between
 * segments — a single task's arc is the whole circle, with no end to cap. */
function ringSegment(
  segment: { length: number; rotation: number },
  index: number,
  stroke: ColorValue,
  capped: boolean,
) {
  return (
    <Circle
      key={index}
      cx={RING_SIZE / 2}
      cy={RING_SIZE / 2}
      r={RING_RADIUS}
      stroke={stroke}
      strokeWidth={RING_STROKE}
      strokeLinecap={capped ? 'round' : 'butt'}
      fill="none"
      strokeDasharray={`${segment.length} ${RING_CIRCUMFERENCE}`}
      transform={`rotate(${segment.rotation} ${RING_SIZE / 2} ${RING_SIZE / 2})`}
    />
  );
}

/**
 * The accent runs *around* the ring rather than across its box: peach where
 * the first segment starts at 12 o'clock, rose halfway round, lavender by the
 * time the last segment closes — the warm end leads, so the first task ticked
 * off lands in the brightest colour. SVG has no conic gradient, so the sweep
 * is drawn as this many thin arcs, each one flat-coloured for its angle — at
 * a 4° step the banding is below what the eye picks out on a 6pt stroke.
 */
const RING_SWEEP_SLICES = 90;
/** How far each slice overlaps the next, along the ring — butted edge to
 * edge, anti-aliasing leaves a hairline seam of background between them. */
const RING_SWEEP_OVERLAP = 0.6;

/** The sweep's slices, clockwise from 12 o'clock. */
const ringSweep = Array.from({ length: RING_SWEEP_SLICES }, (_, i) => ({
  rotation: -90 + (i * 360) / RING_SWEEP_SLICES,
  // Coloured at the slice's middle, so the first and last land just inside
  // the two end stops rather than exactly on them.
  color: accentAt((i + 0.5) / RING_SWEEP_SLICES),
}));

/** Where the photo sits inside the ring's box: clear of the stroke and the
 * gap between them. */
const AVATAR_INSET = RING_STROKE + RING_GAP;

type DaysView = 'grid' | 'month';

/** One empty list for every profile with no earlier eras, so the month's
 * memo doesn't see a new one each render. */
const NO_RUNS: readonly ProfileRun[] = [];

/** One of a day's proof photos, keyed by its task. */
export interface ProfileShot {
  key: string;
  photo: ImageSourcePropType | null;
  seed: string | null;
}

/** What a profile knows about one challenge day. */
export interface ProfileDay {
  /** Its photos, in checklist order. */
  shots: readonly ProfileShot[];
  /** How many of its tasks were done. */
  done: number;
}

/** An era the profile ran before the current one, its days kept on the page:
 * after the current era's in the grid, and on their dates in the month. */
export interface ProfileRun {
  key: string;
  /** The era's name, stamped on its tiles. */
  name: string;
  startDate: Date;
  totalDays: number;
  taskCount: number;
  /** Days before this one with nothing on them were missed; the run never
   * reached the days after it. */
  lastDay: number;
  dayOf: (day: number) => ProfileDay | null;
  /** Its days in the grid, most recent first. */
  posted: readonly number[];
  onOpenDay: (day: number) => void;
}

export interface ProfileViewProps {
  avatar: AvatarSource;
  name: string;
  handle: string;
  bio: string | null;
  /** Null for an account in no era: the ring and the era's name go, and
   * only past eras' days are left to show. */
  challenge: { id: string; name: string; joined: number } | null;
  startDate: Date;
  /** The run's day today; 0 before Day 1, when the card says when it starts. */
  currentDay: number;
  totalDays: number;
  /** Tasks in a day — the ring's segments and every "3/5". */
  taskCount: number;
  /**
   * A day's record, or null where the profile has none to show. A null past
   * day is left blank on the calendar rather than marked missed: someone
   * else's history only reaches as far as what's been shared.
   */
  dayOf: (day: number) => ProfileDay | null;
  /** The days in the grid, most recent first. */
  posted: readonly number[];
  /** Eras run before this one, most recent first. */
  pastRuns?: readonly ProfileRun[];
  /** Plays today's story from the photo; left out while there's none. */
  onPlayStory?: () => void;
  /** Opens a past day's post, from its tile or its calendar cell. */
  onOpenDay: (day: number) => void;
  /** Where today's calendar cell leads, and what a screen reader hears of it. */
  today?: { onPress: () => void; hint: string };
  /** What the grid says while it has no days in it. */
  emptyHint: string;
  /** The heading over the days — "My days" on your own page. */
  daysTitle?: string;
  /** A row of buttons under the bio — on someone else's page, where you
   * stand with them and Share. One without `onPress` is a status, not a
   * button — "Friends". */
  actions?: readonly { label: string; onPress?: () => void }[];
  style?: StyleProp<ViewStyle>;
}

/**
 * A profile's whole page under its header — the photo in its task ring,
 * name, handle and bio, the challenge card, and the days as a grid or a
 * month. Your own Profile tab and anyone else's profile are both this, so
 * the two can't drift: only the header differs, where yours carries
 * Settings and theirs the way back.
 */
export function ProfileView({
  avatar,
  name,
  handle,
  bio,
  challenge,
  startDate,
  currentDay,
  totalDays,
  taskCount,
  dayOf,
  posted,
  pastRuns = NO_RUNS,
  onPlayStory,
  onOpenDay,
  today,
  emptyHint,
  daysTitle = 'Days',
  actions,
  style,
}: ProfileViewProps) {
  // Plain colours for the appearance on show, for what takes no adaptive
  // ones: the ring's SVG greys and the calendar's system arrows.
  const svgColors = colorsFor(useColorScheme());
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();

  const [daysView, setDaysView] = useState<DaysView>('grid');
  // Which month the month view shows, counted in months from this one — 0 is
  // now, -1 last month. An offset rather than a date, so the view still opens
  // on the current month once the calendar rolls into a new one.
  const [monthOffset, setMonthOffset] = useState(0);
  // The year sheet's own pick, held apart from the month on show until Done —
  // the wheel passes a year per row, and redrawing the calendar behind the
  // sheet at every one of them is work nobody sees.
  const [yearSheetOpen, setYearSheetOpen] = useState(false);
  const [pendingYear, setPendingYear] = useState(0);

  // How many of today's tasks are ticked off — what the ring fills in.
  const doneToday = dayOf(currentDay)?.done ?? 0;

  // Every posted day, most recent first — the current era's, then each
  // earlier era's — each one cut into the same merged mosaic the Tasks tab
  // and a post use. Only the tasks that actually got a photo take a slice of
  // the cell: a day with three of five shot reads as three prints, not three
  // prints and two grey gaps.
  const runs = [
    ...(challenge ? [{ key: 'now', name: challenge.name, taskCount, dayOf, posted, onOpenDay }] : []),
    ...pastRuns,
  ];
  const posts = runs.flatMap((run) =>
    run.posted.flatMap((day) => {
      const record = run.dayOf(day);
      return record
        ? [{
            key: `${run.key}-day-${day}`,
            day,
            name: run.name,
            taskCount: run.taskCount,
            rows: record.shots,
            done: record.done,
            open: () => run.onOpenDay(day),
          }]
        : [];
    }),
  );

  // The month on show, laid out day by day. Any month can be paged to —
  // before the app, after the challenge — and a date outside the challenge is
  // just an empty cell. Inside it, a past day with photos opens its post,
  // exactly as its grid tile does; today leads wherever `today` says; a
  // missed day and a day still to come have nothing to open.
  const shownMonth = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    /** Which challenge day a calendar date is, or null if it is outside it.
     * Rounded rather than floored: a daylight-saving shift puts a fractional
     * day between two dates, which would otherwise slide every date after it
     * back by one. */
    const dayNumber = (date: Date, start: Date, length: number) => {
      const n = Math.round((date.getTime() - start.getTime()) / DAY_MS) + 1;
      return n >= 1 && n <= length ? n : null;
    };

    const first = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const year = first.getFullYear();
    const month = first.getMonth();
    const length = new Date(year, month + 1, 0).getDate();
    const days: Record<number, CalendarDay> = {};

    for (let date = 1; date <= length; date += 1) {
      const on = new Date(year, month, date);
      const day = challenge ? dayNumber(on, startDate, totalDays) : null;
      const isToday = on.getTime() === now.getTime();
      const record = day === null ? null : dayOf(day);
      const shots = record?.shots ?? [];
      const done = record?.done ?? 0;
      const cell: CalendarDay = { shots, past: on <= now, today: isToday, inRun: day !== null };

      // Outside the current era, the date may belong to an earlier one —
      // the most recent that has a photo on it, or a day it missed there.
      const earlier =
        day === null
          ? pastRuns.flatMap((run) => {
              const n = dayNumber(on, run.startDate, run.totalDays);
              if (n === null || n > run.lastDay) return [];
              const past = run.dayOf(n);
              return past?.shots.length || n < run.lastDay ? [{ run, n, past }] : [];
            })[0]
          : undefined;
      if (earlier) {
        const { run, n, past } = earlier;
        cell.inRun = true;
        cell.shots = past?.shots ?? [];
        if (cell.shots.length) {
          cell.onPress = () => run.onOpenDay(n);
          cell.label = `${run.name}, Day ${n}, ${past?.done ?? 0} of ${run.taskCount} tasks. Opens this day's post.`;
        } else {
          cell.missed = true;
          cell.label = `${MONTH_NAMES[month]} ${date}, ${run.name} Day ${n}. Missed.`;
        }
      }

      if (day !== null && day < currentDay && record) {
        // No count on a cell: its photos are the day, and how many tasks
        // it got is one tap away on the post. Only a day with nothing at
        // all says so, as missed.
        if (!shots.length && done < taskCount) cell.missed = true;
        if (shots.length) {
          cell.onPress = () => onOpenDay(day);
          cell.label = `Day ${day}, ${done} of ${taskCount} tasks. Opens this day's post.`;
        } else {
          cell.label = `${MONTH_NAMES[month]} ${date}, Day ${day}. Missed.`;
        }
      } else if (day !== null && isToday) {
        if (today) cell.onPress = today.onPress;
        cell.label = `Today, Day ${day}, ${done} of ${taskCount} so far.${
          today ? ` ${today.hint}` : ''
        }`;
      }
      days[date] = cell;
    }

    return { month: first, days };
  }, [monthOffset, challenge, startDate, totalDays, currentDay, taskCount, dayOf, onOpenDay, today, pastRuns]);

  // The years the picker offers: back from this one, stretched to take in the
  // year the challenge started should it fall further back than that.
  const thisYear = new Date().getFullYear();
  const firstYear = Math.min(thisYear - YEARS_BACK, startDate.getFullYear());
  const years = Array.from({ length: thisYear - firstYear + 1 }, (_, i) => firstYear + i);

  // A year on its own isn't a page — it keeps the month being looked at and
  // moves it to the chosen year, pulled back to this month if that lands it
  // in the future.
  const jumpToYear = (year: number) => {
    setMonthOffset(Math.min(0, monthOffset + (year - shownMonth.month.getFullYear()) * 12));
  };

  const openYearSheet = () => {
    setPendingYear(shownMonth.month.getFullYear());
    setYearSheetOpen(true);
  };

  const runLabel =
    currentDay < 1 ? `${totalDays} days · starts ${shortDate(startDate)}` : `Day ${currentDay} of ${totalDays}`;

  return (
    <View style={style}>
      <View style={styles.identity}>
        <View
          style={styles.ringWrap}
          accessibilityLabel={
            challenge ? `${runLabel}, ${doneToday} of ${taskCount} tasks done today` : undefined
          }
        >
          {/* Counted, not matched to a task: the ring says how many are
              done, filling from the top, whichever ones they were. Done
              segments wear the profile's own warm accent; open ones take
              the empty-day grey the story ring uses.

              The sweep is laid once around the whole ring and shown
              through the done segments as a mask, so a segment's colour
              is simply where it sits on the circle — the first one
              peach, the last one lavender, whichever tasks are done.

              With no era there is no day to gauge: the photo alone, in the
              same box, so the name under it doesn't move. */}
          {challenge ? (
            <Svg width={RING_SIZE} height={RING_SIZE} style={styles.ringSvg}>
              <Defs>
                {/* White is what a mask lets through — the done segments'
                    shape, not a colour anyone sees. */}
                <Mask
                  id="ringDone"
                  maskUnits="userSpaceOnUse"
                  x={0}
                  y={0}
                  width={RING_SIZE}
                  height={RING_SIZE}
                >
                  {ringSegments(taskCount)
                    .slice(0, doneToday)
                    .map((segment, index) =>
                      ringSegment(segment, index, svgColors.onMedia, taskCount > 1),
                    )}
                </Mask>
              </Defs>
  
              {ringSegments(taskCount).map((segment, index) =>
                index < doneToday
                  ? null
                  : ringSegment(segment, index, svgColors.inkGhost, taskCount > 1),
              )}
              <G mask="url(#ringDone)">
                {ringSweep.map((slice, index) => (
                  <Circle
                    key={index}
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RING_RADIUS}
                    stroke={slice.color}
                    strokeWidth={RING_STROKE}
                    fill="none"
                    strokeDasharray={`${RING_CIRCUMFERENCE / RING_SWEEP_SLICES + RING_SWEEP_OVERLAP} ${RING_CIRCUMFERENCE}`}
                    transform={`rotate(${slice.rotation} ${RING_SIZE / 2} ${RING_SIZE / 2})`}
                  />
                ))}
              </G>
            </Svg>
          ) : null}

          {/* The disc behind the photo is the avatar's own shape, so the
              hard shadow has something solid to cast from. A tap plays
              today's story — the ring around it is that story's progress —
              and does nothing on a day with no photo yet. */}
          <View style={[styles.avatarDisc, shadows.hard]}>
            <Pressable
              accessibilityRole={onPlayStory ? 'button' : undefined}
              accessibilityLabel={onPlayStory ? "Watch today's story" : 'Profile photo'}
              disabled={!onPlayStory}
              onPress={onPlayStory}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Avatar source={avatar} size={avatarSize} />
            </Pressable>
          </View>
        </View>

        {/* Stacked under the photo and centred on it. A missing bio is
            simply left out rather than standing in as placeholder text. */}
        <View style={styles.identityText}>
          <Text variant="pageTitle" center>
            {name}
          </Text>
          <Text variant="metaBold" color={colors.inkGhost} center>
            {handle}
          </Text>
          {bio ? (
            <Text variant="copy" color={colors.inkMuted} center style={styles.bio}>
              {bio}
            </Text>
          ) : null}
          {/* The era this profile is running, by name — what they're into,
              where a profile says so — and a way into its page. */}
          {challenge ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${challenge.name}, ${runLabel}`}
              accessibilityHint="Opens the era"
              onPress={() => router.push({ pathname: '/feed/[id]', params: { id: challenge.id } })}
              hitSlop={spacing.sm}
              style={({ pressed }) => [styles.eraLink, pressed && styles.pressed]}
            >
              <Text variant="metaBold" numberOfLines={1}>
                {challenge.name}
              </Text>
              <Ionicons name="chevron-forward" size={ERA_CHEVRON} color={colors.ink} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {actions?.length ? (
        <View style={styles.actions}>
          {actions.map((action) => (
            <View key={action.label} style={styles.action}>
              <Pill
                label={action.label}
                tone="muted"
                labelVariant="copyBold"
                onPress={action.onPress}
                style={styles.actionPill}
              />
            </View>
          ))}
        </View>
      ) : null}


      {/* The days' two views as tabs across the page — a glyph each, the
          one on show underlined — the way a profile on the phone heads the
          things it's made of. They are the section's heading, so the photos
          start straight under them. */}
      <View style={styles.tabs} accessibilityRole="tablist" accessibilityLabel={daysTitle}>
        {DAYS_TABS.map((tab) => {
          const active = tab.key === daysView;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: active }}
              onPress={() => setDaysView(tab.key)}
              style={styles.tab}
            >
              {NATIVE_HEADER ? (
                <SymbolView
                  name={tab.symbol}
                  size={TAB_GLYPH}
                  tintColor={active ? svgColors.ink : svgColors.inkMuted}
                  weight={active ? 'semibold' : 'regular'}
                />
              ) : (
                <Ionicons
                  name={tab.icon}
                  size={TAB_GLYPH}
                  color={active ? colors.ink : colors.inkMuted}
                />
              )}
              {/* The marker under the tab on show: a solid bar in ink rather
                  than a border, which on the iPhone didn't take the ink. */}
              {active ? <View style={styles.tabIndicator} /> : null}
            </Pressable>
          );
        })}
      </View>

      {daysView === 'month' ? (
        <CalendarMonth
          month={shownMonth.month}
          days={shownMonth.days}
          style={styles.month}
          header={
            NATIVE_HEADER ? (
              // On the iPhone: the month's name is a pull-down menu of the
              // years, the way the Calendar app jumps a year, and the arrows
              // are plain system symbols rather than drawn buttons.
              <Host matchContents={{ vertical: true }} style={styles.monthHost}>
                <HStack>
                  <Menu
                    label={
                      <HStack spacing={layout.line}>
                        {/* The month in ink, set on the text itself: a
                            menu's label otherwise takes the accent. */}
                        <SystemText
                          modifiers={[quicksand('headline', 'bold'), foregroundStyle(svgColors.ink)]}
                        >
                          {`${MONTH_NAMES[shownMonth.month.getMonth()]} ${shownMonth.month.getFullYear()}`}
                        </SystemText>
                        <SystemImage
                          systemName="chevron.down"
                          modifiers={[
                            font({ textStyle: 'footnote', weight: 'semibold' }),
                            foregroundStyle(svgColors.ink),
                          ]}
                        />
                      </HStack>
                    }
                    modifiers={[foregroundStyle(svgColors.ink)]}
                  >
                    {[...years].reverse().map((year) => (
                      <Button
                        key={year}
                        label={String(year)}
                        systemImage={
                          year === shownMonth.month.getFullYear() ? 'checkmark' : undefined
                        }
                        onPress={() => jumpToYear(year)}
                      />
                    ))}
                  </Menu>
                  <Spacer />
                  <HStack spacing={layout.block}>
                    <Button
                      onPress={() => setMonthOffset(monthOffset - 1)}
                      // In the system blue, as the system calendar's own
                      // month arrows are.
                      modifiers={[buttonStyle('borderless'), foregroundStyle(svgColors.systemAccent)]}
                    >
                      <SystemImage
                        systemName="chevron.left"
                        modifiers={[font({ textStyle: 'body', weight: 'semibold' })]}
                      />
                    </Button>
                    {/* This month is as far as it goes — the calendar shows
                        what has been, not what's ahead. */}
                    <Button
                      onPress={() => setMonthOffset(monthOffset + 1)}
                      modifiers={[
                        buttonStyle('borderless'),
                        foregroundStyle(
                          monthOffset >= 0
                            ? { type: 'hierarchical', style: 'tertiary' }
                            : svgColors.systemAccent,
                        ),
                        disabledModifier(monthOffset >= 0),
                      ]}
                    >
                      <SystemImage
                        systemName="chevron.right"
                        modifiers={[font({ textStyle: 'body', weight: 'semibold' })]}
                      />
                    </Button>
                  </HStack>
                </HStack>
              </Host>
            ) : (
              // The month's name leads on the left and opens the year picker;
              // both arrows sit together at the end, one thumb's reach apart
              // rather than at opposite edges of the page. They go as far back
              // as anyone pages — an empty month before the app is still a
              // month — and forward only as far as this one.
              <View style={styles.monthHeader}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${MONTH_NAMES[shownMonth.month.getMonth()]} ${shownMonth.month.getFullYear()}. Change year`}
                  onPress={openYearSheet}
                  hitSlop={spacing.sm}
                  style={({ pressed }) => [styles.monthTitle, pressed && styles.pressed]}
                >
                  <Text variant="itemTitle" style={styles.monthTitleText}>
                    {`${MONTH_NAMES[shownMonth.month.getMonth()]} ${shownMonth.month.getFullYear()}`}
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={MONTH_CARET}
                    color={colors.ink}
                    style={styles.monthCaret}
                  />
                </Pressable>

                <View style={styles.monthArrows}>
                  <IconButton
                    name="chevron-back"
                    size={MONTH_ARROW_BUTTON}
                    iconSize={MONTH_ARROW_ICON}
                    background={colors.surfaceSunken}
                    shadow={false}
                    onPress={() => setMonthOffset(monthOffset - 1)}
                    accessibilityLabel="Previous month"
                  />
                  <IconButton
                    name="chevron-forward"
                    size={MONTH_ARROW_BUTTON}
                    iconSize={MONTH_ARROW_ICON}
                    background={colors.surfaceSunken}
                    shadow={false}
                    // This month is as far as it goes — the calendar shows
                    // what has been, not what's ahead.
                    disabled={monthOffset >= 0}
                    onPress={() => setMonthOffset(monthOffset + 1)}
                    accessibilityLabel="Next month"
                  />
                </View>
              </View>
            )
          }
        />
      ) : posts.length === 0 ? (
        <EmptyState icon="camera-outline" title="No days yet" hint={emptyHint} />
      ) : (
        <View style={styles.postGrid}>
          {posts.map((post) => {
            const finished = post.done === post.taskCount;
            return (
              <View key={post.key} style={styles.postCellWrap}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    finished
                      ? `${post.name}, Day ${post.day}, finished`
                      : `${post.name}, Day ${post.day}, ${post.done} of ${post.taskCount} tasks`
                  }
                  onPress={post.open}
                  style={({ pressed }) => [styles.postTile, pressed && styles.pressed]}
                >
                  <MosaicArrangement
                    cells={post.rows}
                    seam={DAY_CELL_SEAM}
                    renderCell={(row) =>
                      row.photo ? (
                        <Image
                          key={row.key}
                          source={row.photo}
                          style={DAY_CELL_PIECE}
                          contentFit="cover"
                        />
                      ) : (
                        <Placeholder
                          key={row.key}
                          seed={row.seed ?? undefined}
                          radius={0}
                          style={DAY_CELL_PIECE}
                        />
                      )
                    }
                  />

                  {/* The opened post's own stamp, set at the post's width
                      — its photos run edge to edge, so the window's — and
                      scaled down whole, so the tile is a miniature of the
                      post rather than a pile of photos with a label. */}
                  {/* No task count on the tile, finished or not — a day is
                      its photos, and how many tasks it got is one tap away
                      on the post, the way a calendar cell leaves it. */}
                  <DayStamp day={post.day} kicker={post.name} referenceWidth={windowWidth} />
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      {/* The year, picked on the iPhone's own date-wheel drum from a sheet
          at the bottom. Done moves the calendar; tapping away leaves it. */}
      <BottomSheet visible={yearSheetOpen} onDismiss={() => setYearSheetOpen(false)}>
        <Text variant="sectionHeading" center>
          Year
        </Text>
        <WheelPicker
          // Remounted on every open, so the drum starts on the year on show
          // rather than wherever it was last left.
          key={yearSheetOpen ? 'open' : 'closed'}
          values={years}
          value={pendingYear}
          onChange={setPendingYear}
          style={styles.yearWheel}
        />
        <PrimaryButton
          label="Done"
          onPress={() => {
            jumpToYear(pendingYear);
            setYearSheetOpen(false);
          }}
        />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  identity: {
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringSvg: {
    position: 'absolute',
  },
  avatarDisc: {
    position: 'absolute',
    top: AVATAR_INSET,
    left: AVATAR_INSET,
    width: avatarSize,
    height: avatarSize,
    borderRadius: avatarSize / 2,
    backgroundColor: colors.backgroundPlain,
  },
  identityText: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: layout.block,
  },
  bio: {
    marginTop: layout.line,
  },
  // Two equal buttons side by side, a stack's gap apart.
  actions: {
    flexDirection: 'row',
    gap: layout.stack,
    marginTop: layout.block,
  },
  action: {
    flex: 1,
  },
  // The palette's fill grey rather than the pill's warmer muted tone, and
  // stretched across its half of the row.
  actionPill: {
    alignSelf: 'stretch',
    backgroundColor: colors.surfaceSunken,
  },
  monthHost: {
    alignSelf: 'stretch',
  },
  // The era's name under the username, its chevron close beside it.
  eraLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.line / 2,
    marginTop: layout.stack,
  },
  // Within the page's margins, as the calendar is, a hairline under both
  // tabs.
  tabs: {
    flexDirection: 'row',
    marginTop: layout.section,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.inkGhost,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: layout.inline,
  },
  // Laid along the tab's foot, over the row's hairline.
  tabIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: TAB_INDICATOR,
    backgroundColor: colors.ink,
  },
  month: {
    marginTop: layout.block,
    marginBottom: layout.section,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthArrows: {
    flexDirection: 'row',
    gap: layout.stack,
  },
  yearWheel: {
    marginVertical: layout.block,
  },
  monthTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    // Half the usual gap: the name's own right padding below makes up the
    // rest, so the caret still sits a full `xs` off the last digit.
    gap: spacing.xs / 2,
  },
  monthTitleText: {
    // The title's -1 tracking is applied after the last glyph too, so the
    // measured box ends a point short of the ink and the Bold "6" of the
    // year was clipped at its right edge. Room for that point and the
    // glyph's overhang.
    paddingRight: spacing.xs / 2,
    // Android pads a line with the font's own ascent/descent on top of the
    // line height, which sits the name lower than its box's centre.
    includeFontPadding: false,
  },
  monthCaret: {
    // Measured off the two fonts: the chevron sits dead centre in its icon
    // box, but Quicksand's caps and digits sit ~0.5pt below the centre of
    // `itemTitle`'s 18/24 line. In a centred row a 1pt top margin moves the caret half
    // that, onto the same line as the name.
    marginTop: MONTH_CARET_NUDGE,
  },
  // Edge to edge — the reference's own photo grid runs the full page width,
  // no gutter either side — the gap lives between tiles (on `postCellWrap`
  // below), not inside one.
  // Within the page's margins, lined up with the tabs and the calendar: the
  // outer tiles' half-seams are pulled back so their edges meet the margin.
  postGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -PHOTO_GRID_SEAM / 2,
    // A breath under the tabs, so the first row of days doesn't sit on the
    // underline.
    marginTop: layout.stack,
  },
  // Half the seam on each side of every tile, so two neighbours add up to a
  // whole one between them.
  postCellWrap: {
    width: '33.333%',
    padding: PHOTO_GRID_SEAM / 2,
  },
  // Square, unrounded, like a photo in the library.
  postTile: {
    aspectRatio: 1,
    overflow: 'hidden',
    backgroundColor: colors.surfaceSunken,
  },
});

export default ProfileView;
