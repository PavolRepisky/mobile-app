import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { absoluteFill, colors, layout, radii, spacing } from '@/constants/theme';
import { Placeholder } from './Placeholder';
import { Text } from './Text';

/**
 * One month, drawn as a seven-column grid: the day's photos sit behind its
 * number, so a month reads as the film you shot that month rather than as a
 * table of dates. Every day of the challenge gets a solid grey cell, shot or
 * not, so the month reads as a full sheet of cells rather than photos floating
 * among empty boxes; dates either side of the run stay bare numbers. Today
 * wears a blacked-out border instead. Its greys are My Profile's own:
 * `inkMuted` for past dates, `inkGhost` for dates still to come,
 * `surfaceSunken` for every fill.
 */

/** Spoken and printed month names. Exported so callers can label a date too. */
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Weeks start on Monday, the way the rest of the app counts a challenge. */
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** A touch taller than wide — enough to read as a print rather than a swatch,
 * short of a full print's shape, whose month would run half a screen
 * further down. */
const CELL_ASPECT = 0.86;

/**
 * A day cell's own corner — tighter than the app's usual `radii.sm`, so a
 * seven-across grid of them reads as squared-off contact prints rather than
 * as rounded app tiles.
 */
const CELL_RADIUS = 6;

/** How many of a day's shots the cell tiles before it stops. */
const MOSAIC_MAX = 4;

/**
 * Every piece of the mosaic, whatever shape it ends up: the containers do the
 * cutting, so a piece only ever has to take its share of one. Kept out of the
 * stylesheet because it is handed to an `Image` as often as to a `View`, and
 * the two disagree about what a style is allowed to say.
 */
const PIECE = { flex: 1 } as const;

/** The missed day's dash, small enough that seven cells across still leave
 * the numeral the main thing in each. */
const DASH_WIDTH = 16;

/** One of the day's proof photos — a real picture, or a drawn stand-in. */
export interface DayShot {
  photo?: ImageSourcePropType | null;
  seed?: string | null;
}

export interface CalendarDay {
  /**
   * Everything photographed that day, in checklist order. Up to four are
   * tiled into the cell: a day is several photographs, and a grid of single
   * covers hides that the record is fuller than one picture per square.
   */
  shots?: readonly DayShot[];
  /** Already lived through — today counts, tomorrow does not. */
  past?: boolean;
  /** Today, wherever in the challenge that falls. */
  today?: boolean;
  /** Read in place of the bare numeral. */
  label?: string;
  /** A challenge day that passed with nothing shot — a dash across the cell,
   * so a gap in the record reads as missed rather than as not yet begun. */
  missed?: boolean;
  /**
   * Falls inside the challenge. Only these get a cell: the run reads as a
   * stretch of slots to fill, and the dates either side of it stay bare
   * numbers instead of a wall of empty boxes.
   */
  inRun?: boolean;
  onPress?: () => void;
}

export interface CalendarMonthProps {
  /** Any date inside the month to draw. */
  month: Date;
  /** What each date holds, keyed by day of the month. */
  days: Record<number, CalendarDay>;
  /** The month's heading — the caller pages between months, so its arrows
   * and year picker live here. */
  header: ReactNode;
  style?: StyleProp<ViewStyle>;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** How many blank cells lead the first row, counting from Monday. */
function leadingBlanks(year: number, month: number): number {
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

export function CalendarMonth({ month, days, header, style }: CalendarMonthProps) {
  const year = month.getFullYear();
  const index = month.getMonth();

  const cells: (number | null)[] = [
    ...Array.from({ length: leadingBlanks(year, index) }, () => null),
    ...Array.from({ length: daysInMonth(year, index) }, (_, i) => i + 1),
  ];

  return (
    <View style={style}>
      {header}

      <View style={styles.weekdays}>
        {WEEKDAYS.map((name) => (
          <Text key={name} variant="badge" color={colors.inkMuted} center style={styles.weekday}>
            {/* One letter, as the Tasks tracker heads its week — three-letter
                caps over seven narrow columns read as a row of labels rather
                than a calendar's quiet top line. */}
            {name[0]}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((date, i) => (
          <View key={date ?? `blank-${i}`} style={styles.cell}>
            {date === null ? null : <DayCell date={date} day={days[date] ?? {}} />}
          </View>
        ))}
      </View>
    </View>
  );
}

function DayCell({ date, day }: { date: number; day: CalendarDay }) {
  const { shots, past, today, missed, inRun, onPress } = day;
  const tiles = (shots ?? []).slice(0, MOSAIC_MAX);
  const hasShot = tiles.length > 0;

  // The photographs are the page; every bare numeral stays quiet under them.
  // White reads on a photograph and vanishes on a blank cell, so the numeral
  // follows what is actually behind it. Today with nothing shot yet has only
  // the cell's black border, so it takes full ink to stand out. A date
  // outside the run was never a day to shoot at all, so it takes the quietest
  // grey whichever side of today it falls; inside it, a day that has been and
  // gone is still a day you could have shot, so it holds more weight than one
  // that has not arrived yet.
  const numberColor = hasShot
    ? colors.inkInverse
    : today
      ? colors.ink
      : !inRun && !missed
        ? colors.inkGhost
        : past
          ? colors.inkMuted
          : colors.inkGhost;

  const numeral = (
    <Text variant="metaBold" color={numberColor}>
      {date}
    </Text>
  );

  const body = hasShot ? (
    <View style={[styles.tile, today && styles.today]}>
      <Mosaic tiles={tiles} date={date} today={today} />
      {/* The numeral is white on whatever the day happened to look like, so it
          needs a wash under it rather than trusting the photo to be dark. */}
      <View style={[styles.scrim, today && styles.scrimToday]} />
      {numeral}
    </View>
  ) : (
    <View
      style={[
        styles.plain,
        inRun && styles.plainInRun,
        today && styles.today,
        missed && styles.plainMissed,
      ]}
    >
      {numeral}
      {missed ? <View style={styles.missDash} /> : null}
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

/**
 * The day's shots tiled into one square, cut the way a photo grid cuts a set:
 * one fills it, two split it across, three put one over a pair, and four take
 * a corner each, edge to edge — one print cut into pieces rather than a set of
 * separate ones. Anything past four is dropped: at this size a fifth tile is a
 * smudge, and the story behind the tap has all of them anyway.
 */
function Mosaic({
  tiles,
  date,
  today,
}: {
  tiles: readonly DayShot[];
  date: number;
  today?: boolean;
}) {
  const shot = (t: DayShot, i: number) =>
    t.photo ? (
      <Image key={i} source={t.photo} style={PIECE} contentFit="cover" />
    ) : (
      <Placeholder key={i} seed={t.seed ?? `day-${date}-${i}`} radius={0} style={PIECE} />
    );

  const photoStyle = [styles.photo, today && styles.photoToday];
  const column = [...photoStyle, styles.mosaicColumn];

  if (tiles.length === 1) {
    return <View style={photoStyle}>{shot(tiles[0], 0)}</View>;
  }

  if (tiles.length === 2) {
    return <View style={column}>{tiles.map((t, i) => shot(t, i))}</View>;
  }

  if (tiles.length === 3) {
    return (
      <View style={column}>
        {shot(tiles[0], 0)}
        <View style={styles.mosaicRow}>
          {shot(tiles[1], 1)}
          {shot(tiles[2], 2)}
        </View>
      </View>
    );
  }

  return (
    <View style={column}>
      <View style={styles.mosaicRow}>
        {shot(tiles[0], 0)}
        {shot(tiles[1], 1)}
      </View>
      <View style={styles.mosaicRow}>
        {shot(tiles[2], 2)}
        {shot(tiles[3], 3)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  weekdays: {
    flexDirection: 'row',
    marginTop: layout.block,
    marginBottom: layout.stack,
  },
  weekday: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // Matches the horizontal gap the cell's own padding makes, so the grid
    // reads as evenly spaced in both directions.
    rowGap: layout.grid,
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: CELL_ASPECT,
    // A hair of air between neighbouring prints; the row gap matches it.
    paddingHorizontal: layout.grid / 2,
  },
  press: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  // A photo day is the photos alone: no hairline and no shadow, so a finished
  // run reads as one sheet of prints rather than a stack of framed tiles.
  tile: {
    flex: 1,
    borderRadius: CELL_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSunken,
  },
  // Today, shot or not, is marked by darkening the cell's own border rather
  // than a separate ring or a disc behind the numeral.
  today: {
    borderWidth: 2,
    borderColor: colors.ink,
  },
  photo: {
    ...absoluteFill,
    borderRadius: CELL_RADIUS,
    // The corner is clipped here rather than on each piece: a mosaic's inner
    // tiles are square, and only the block they make takes the tile's radius.
    overflow: 'hidden',
    backgroundColor: colors.surfaceSunken,
  },
  // Today's border sits the photo a step in, so its corner is tightened to
  // stay concentric with it.
  photoToday: {
    borderRadius: CELL_RADIUS - 2,
  },
  mosaicColumn: {
    flexDirection: 'column',
  },
  mosaicRow: {
    flex: 1,
    flexDirection: 'row',
  },
  scrim: {
    ...absoluteFill,
    borderRadius: CELL_RADIUS - 1,
    backgroundColor: colors.scrimPhoto,
  },
  scrimToday: {
    borderRadius: CELL_RADIUS - 2,
  },
  // A date outside the run: just its number on the page, no cell at all.
  plain: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: CELL_RADIUS,
  },
  plainInRun: {
    backgroundColor: colors.surfaceSunken,
  },
  // A sunken fill under the dash, so a missed day reads as a hole in the run
  // rather than one more quiet number.
  plainMissed: {
    backgroundColor: colors.surfaceSunken,
  },
  missDash: {
    position: 'absolute',
    width: DASH_WIDTH,
    height: 2,
    bottom: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.inkMuted,
    transform: [{ rotate: '-40deg' }],
  },
});

export default CalendarMonth;
