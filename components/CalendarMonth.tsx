import { Image } from 'expo-image';
import {
  Pressable,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { absoluteFill, colors, radii, shadows, spacing } from '@/constants/theme';
import { Placeholder } from './Placeholder';
import { Text } from './Text';

/**
 * One month, drawn as a seven-column grid: the day's cover shot sits behind its
 * number, so a month reads as the film you shot that month rather than as a
 * table of dates. Days you have not lived through yet are numbers on their own,
 * and today wears the filled disc a calendar always puts on it.
 *
 * The month is the unit rather than the week because it is what people name a
 * stretch of time by. The heading is set in the functional face rather than in
 * Playfair: it is a label on a grid of dates, not a line anybody reads.
 */

/** Spoken and printed month names. Exported so callers can label a date too. */
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Weeks start on Monday, the way the rest of the app counts a challenge. */
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Proportion of a cell: a shot printed slightly taller than it is wide, so
 * seven of them across a phone still read as photographs and not as swatches.
 */
const CELL_ASPECT = 0.76;

/** The disc under today's numeral. Sized off the numeral, not off the cell. */
const TODAY_DISC = 32;

/** The ink hairline that marks today when it already has a photo on it. */
const TODAY_RING = 2;

/** The rule drawn under a stretch of days that belonged to a challenge. */
const RUN_BAR = 3;

/**
 * A challenge covers most of the weeks it touches, so the rule under it is
 * wallpaper by the time you have scrolled a month. Drawn in ink it read as
 * ruled paper and pushed the numerals into second place; at `inkGhost` it sits
 * in the same quiet layer as they do, and the name written under its opening
 * week is what tells you what the track is.
 */
const RUN_COLOR = colors.inkGhost;

/**
 * Side inset on a run's rule, matching the one the prints carry, so the rule
 * starts and stops flush with the tile above its first and last day rather
 * than with the cell's outer edge.
 */
const CELL_INSET = 2;

export interface CalendarDay {
  /** The day's cover shot. Fills the cell, with the numeral over it. */
  photo?: ImageSourcePropType | null;
  /** Seed for the drawn stand-in, where the day's shot is a placeholder. */
  seed?: string | null;
  /** Already lived through — today counts, tomorrow does not. */
  past?: boolean;
  /** Part of a challenge. The run is underlined across the weeks it spans. */
  inChallenge?: boolean;
  /** The challenge's opening day — the run is named under the week holding it. */
  runStart?: boolean;
  /** Today, wherever in the challenge that falls. */
  today?: boolean;
  /** Read in place of the bare numeral. */
  label?: string;
  onPress?: () => void;
}

export interface CalendarMonthProps {
  /** Any date inside the month to draw. */
  month: Date;
  /** What each date holds, keyed by day of the month. */
  days: Record<number, CalendarDay>;
  /** Name written under the week where a challenge run opens. */
  runLabel?: string;
  style?: StyleProp<ViewStyle>;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** How many blank cells lead the first row, counting from Monday. */
function leadingBlanks(year: number, month: number): number {
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

interface Run {
  /** Column the run opens in, 0-6. */
  start: number;
  length: number;
  /** The challenge starts inside this stretch, so it is the one to name. */
  named: boolean;
}

/**
 * The unbroken stretches of challenge days inside one week. A run is per week
 * rather than per month so it can be drawn as a rule beneath that week's
 * columns; a challenge crossing a Sunday simply picks up again on the Monday.
 */
function challengeRuns(
  week: (number | null)[],
  days: Record<number, CalendarDay>,
): Run[] {
  const runs: Run[] = [];
  let i = 0;

  while (i < week.length) {
    const date = week[i];
    if (date === null || !days[date]?.inChallenge) {
      i += 1;
      continue;
    }

    const start = i;
    let named = false;
    while (i < week.length) {
      const on = week[i];
      if (on === null || !days[on]?.inChallenge) break;
      if (days[on]?.runStart) named = true;
      i += 1;
    }

    runs.push({ start, length: i - start, named });
  }

  return runs;
}

export function CalendarMonth({ month, days, runLabel, style }: CalendarMonthProps) {
  const year = month.getFullYear();
  const index = month.getMonth();

  const cells: (number | null)[] = [
    ...Array.from({ length: leadingBlanks(year, index) }, () => null),
    ...Array.from({ length: daysInMonth(year, index) }, (_, i) => i + 1),
  ];

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <View style={style}>
      <Text variant="sectionTitle">{`${MONTH_NAMES[index]} ${year}`}</Text>

      <View style={styles.weekdays}>
        {WEEKDAYS.map((name) => (
          <Text
            key={name}
            variant="micro"
            color={colors.inkMuted}
            center
            style={styles.weekday}
          >
            {name.toUpperCase()}
          </Text>
        ))}
      </View>

      {weeks.map((week, wi) => {
        const runs = challengeRuns(week, days);
        const named = runLabel ? runs.find((run) => run.named) : undefined;

        return (
          <View key={wi} style={styles.week}>
            <View style={styles.weekRow}>
              {week.map((date, i) => (
                <View key={date ?? `blank-${wi}-${i}`} style={styles.cell}>
                  {date === null ? null : (
                    <DayCell date={date} day={days[date] ?? {}} />
                  )}
                </View>
              ))}
            </View>

            {runs.length ? (
              <View style={styles.marks}>
                {runs.map((run) => (
                  <View
                    key={run.start}
                    style={[
                      styles.mark,
                      {
                        left: `${(run.start / 7) * 100}%`,
                        width: `${(run.length / 7) * 100}%`,
                      },
                    ]}
                  >
                    <View style={styles.bar} />
                  </View>
                ))}
              </View>
            ) : null}

            {named ? (
              // Named once, under the week the challenge opens in, rather than
              // repeated down the page: the rule carries it from there on.
              <View style={styles.captionRow}>
                <View style={{ width: `${(named.start / 7) * 100}%` }} />
                <Text variant="micro" color={colors.inkMuted} style={styles.caption}>
                  {runLabel}
                </Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function DayCell({ date, day }: { date: number; day: CalendarDay }) {
  const { photo, seed, past, today, onPress } = day;
  const hasShot = !!photo || !!seed;

  // The photographs are the page; every bare numeral stays quiet under them. A
  // day that has been and gone with nothing on it is still a day you could have
  // shot, so it holds more weight than one that has not arrived yet.
  const numberColor = hasShot
    ? colors.inkInverse
    : past
      ? colors.inkMuted
      : colors.inkGhost;

  const numeral = (
    <Text variant="bodyBold" color={today ? colors.inkInverse : numberColor}>
      {date}
    </Text>
  );

  const body = hasShot ? (
    <View style={[styles.tile, today && styles.tileToday]}>
      {photo ? (
        <Image source={photo} style={styles.photo} contentFit="cover" />
      ) : (
        <Placeholder seed={seed ?? `day-${date}`} radius={radii.sm} style={styles.photo} />
      )}
      {/* The numeral is white on whatever the day happened to look like, so it
          needs a wash under it rather than trusting the photo to be dark. */}
      <View style={styles.scrim} />
      {numeral}
    </View>
  ) : (
    <View style={styles.plain}>
      {today ? <View style={styles.disc}>{numeral}</View> : numeral}
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={day.label ?? String(date)}
      onPress={onPress}
      style={({ pressed }) => [styles.press, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  weekdays: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  weekday: {
    flex: 1,
  },
  week: {
    marginBottom: spacing.md,
  },
  weekRow: {
    flexDirection: 'row',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: CELL_ASPECT,
    // A hair of air between neighbouring prints; the week gap does the rest.
    paddingHorizontal: CELL_INSET,
  },
  marks: {
    height: RUN_BAR,
    marginTop: spacing.xs,
  },
  mark: {
    position: 'absolute',
    top: 0,
    height: RUN_BAR,
    paddingHorizontal: CELL_INSET,
  },
  bar: {
    flex: 1,
    borderRadius: radii.pill,
    backgroundColor: RUN_COLOR,
  },
  captionRow: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  caption: {
    marginLeft: CELL_INSET,
  },
  press: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  tile: {
    flex: 1,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSunken,
    // The corner is clipped on the layers themselves rather than with
    // `overflow: hidden` here, which would eat the shadow on iOS.
    ...shadows.soft,
  },
  tileToday: {
    borderWidth: TODAY_RING,
    borderColor: colors.ink,
  },
  photo: {
    ...absoluteFill,
    borderRadius: radii.sm,
  },
  scrim: {
    ...absoluteFill,
    borderRadius: radii.sm,
    backgroundColor: colors.scrimPhoto,
  },
  plain: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disc: {
    // The disc is a marker sitting in the cell rather than a print filling it,
    // so it takes its size from the numeral and centres in the space.
    width: TODAY_DISC,
    height: TODAY_DISC,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
  },
});

export default CalendarMonth;
