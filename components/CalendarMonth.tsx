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

/** How many of a day's shots the cell tiles before it stops. */
const MOSAIC_MAX = 4;

/**
 * The cut between tiles in the mosaic. A hairline of the page showing through,
 * so the pieces read as separate photographs rather than as one busy one.
 */
const SEAM = 1;

/**
 * Every piece of the mosaic, whatever shape it ends up: the containers do the
 * cutting, so a piece only ever has to take its share of one. Kept out of the
 * stylesheet because it is handed to an `Image` as often as to a `View`, and
 * the two disagree about what a style is allowed to say.
 */
const PIECE = { flex: 1 } as const;

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
  onPress?: () => void;
}

export interface CalendarMonthProps {
  /** Any date inside the month to draw. */
  month: Date;
  /** What each date holds, keyed by day of the month. */
  days: Record<number, CalendarDay>;
  style?: StyleProp<ViewStyle>;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** How many blank cells lead the first row, counting from Monday. */
function leadingBlanks(year: number, month: number): number {
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

export function CalendarMonth({ month, days, style }: CalendarMonthProps) {
  const year = month.getFullYear();
  const index = month.getMonth();

  const cells: (number | null)[] = [
    ...Array.from({ length: leadingBlanks(year, index) }, () => null),
    ...Array.from({ length: daysInMonth(year, index) }, (_, i) => i + 1),
  ];

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

      <View style={styles.grid}>
        {cells.map((date, i) => (
          <View key={date ?? `blank-${i}`} style={styles.cell}>
            {date === null ? null : (
              <DayCell date={date} day={days[date] ?? {}} />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

function DayCell({ date, day }: { date: number; day: CalendarDay }) {
  const { shots, past, today, onPress } = day;
  const tiles = (shots ?? []).slice(0, MOSAIC_MAX);
  const hasShot = tiles.length > 0;

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
      <Mosaic tiles={tiles} date={date} />
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

/**
 * The day's shots tiled into one square, cut the way a photo grid cuts a set:
 * one fills it, two split it across, three put one over a pair, and four take
 * a corner each. Anything past four is dropped — at this size a fifth tile is
 * a smudge, and the story behind the tap has all of them anyway.
 */
function Mosaic({ tiles, date }: { tiles: readonly DayShot[]; date: number }) {
  const shot = (t: DayShot, i: number) =>
    t.photo ? (
      <Image key={i} source={t.photo} style={PIECE} contentFit="cover" />
    ) : (
      <Placeholder key={i} seed={t.seed ?? `day-${date}-${i}`} radius={0} style={PIECE} />
    );

  if (tiles.length === 1) {
    return <View style={styles.photo}>{shot(tiles[0], 0)}</View>;
  }

  if (tiles.length === 2) {
    return (
      <View style={[styles.photo, styles.mosaicColumn]}>
        {tiles.map((t, i) => shot(t, i))}
      </View>
    );
  }

  if (tiles.length === 3) {
    return (
      <View style={[styles.photo, styles.mosaicColumn]}>
        {shot(tiles[0], 0)}
        <View style={styles.mosaicRow}>
          {shot(tiles[1], 1)}
          {shot(tiles[2], 2)}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.photo, styles.mosaicColumn]}>
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
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  weekday: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.md,
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: CELL_ASPECT,
    // A hair of air between neighbouring prints; the row gap does the rest.
    paddingHorizontal: 2,
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
    // The corner is clipped here rather than on each piece: a mosaic's inner
    // tiles are square, and only the block they make takes the tile's radius.
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  mosaicColumn: {
    flexDirection: 'column',
    gap: SEAM,
  },
  mosaicRow: {
    flex: 1,
    flexDirection: 'row',
    gap: SEAM,
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
