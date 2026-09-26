import { Ionicons } from '@expo/vector-icons';
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
 * and today wears a blacked-out border instead.
 *
 * The month is the unit rather than the week because it is what people name a
 * stretch of time by. The heading is set as a section title rather than a
 * headline: it is a label on a grid of dates, not a line anybody reads.
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

/**
 * A day cell's own corner — tighter than the app's usual `radii.sm`, so a
 * seven-across grid of them reads as squared-off contact prints rather than
 * as rounded app tiles.
 */
const CELL_RADIUS = 6;

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

/** The corner mark's own drawing — a tick disc or a count pill, small enough
 * that seven cells across still leave the photo the main thing in each. */
const MARK_SIZE = 16;
const MARK_ICON = 10;

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
  /**
   * How the day went, in the cell's corner: `'done'` is a tick for a day with
   * every task finished, any other string ("3/5") is printed as a count for a
   * day that got part of the way.
   */
  mark?: 'done' | string;
  /** A challenge day that passed with nothing shot — a dash across the cell,
   * so a gap in the record reads as missed rather than as not yet begun. */
  missed?: boolean;
  onPress?: () => void;
}

export interface CalendarMonthProps {
  /** Any date inside the month to draw. */
  month: Date;
  /** What each date holds, keyed by day of the month. */
  days: Record<number, CalendarDay>;
  /**
   * Gives every photo-less day a solid grey fill in place of the hairline
   * outline, so the month reads as a full sheet of cells, shot or not, rather
   * than photos floating among empty boxes — My Profile's own month view.
   */
  filled?: boolean;
  style?: StyleProp<ViewStyle>;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** How many blank cells lead the first row, counting from Monday. */
function leadingBlanks(year: number, month: number): number {
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

export function CalendarMonth({ month, days, filled, style }: CalendarMonthProps) {
  const year = month.getFullYear();
  const index = month.getMonth();

  const cells: (number | null)[] = [
    ...Array.from({ length: leadingBlanks(year, index) }, () => null),
    ...Array.from({ length: daysInMonth(year, index) }, (_, i) => i + 1),
  ];

  return (
    <View style={style}>
      <Text variant="sectionTitleSm">{`${MONTH_NAMES[index]} ${year}`}</Text>

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
              <DayCell date={date} day={days[date] ?? {}} filled={filled} />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

function DayCell({
  date,
  day,
  filled,
}: {
  date: number;
  day: CalendarDay;
  filled?: boolean;
}) {
  const { shots, past, today, mark, missed, onPress } = day;
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

  // White reads on a photograph and vanishes on blank film, so the numeral
  // follows what is actually behind it rather than whether a shot exists.
  // Today with nothing shot yet has no photo or disc behind it any more —
  // just the cell's own black border — so it needs full ink to stand out
  // rather than the plain, muted colour any other past day gets.
  const overPhoto = hasShot;
  const numeral = (
    <Text
      variant="bodyBold"
      color={
        overPhoto
          ? colors.inkInverse
          : today
            ? colors.ink
            : numberColor
      }
    >
      {date}
    </Text>
  );

  const corner = mark ? (
    mark === 'done' ? (
      <View style={styles.markDone}>
        <Ionicons name="checkmark" size={MARK_ICON} color={colors.inkInverse} />
      </View>
    ) : (
      <View style={styles.markCount}>
        <Text variant="micro" color={colors.ink}>
          {mark}
        </Text>
      </View>
    )
  ) : null;

  const content = (
    <>
      <Mosaic tiles={tiles} date={date} today={today} />
      {/* The numeral is white on whatever the day happened to look like, so it
          needs a wash under it rather than trusting the photo to be dark. */}
      <View style={[styles.scrim, today && styles.scrimToday]} />
      {numeral}
      {corner}
    </>
  );

  const body = hasShot ? (
    <View style={[styles.tile, today && styles.tileToday]}>{content}</View>
  ) : (
    <View
      style={[
        styles.plain,
        filled && styles.plainFilled,
        today && styles.plainToday,
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
 * a corner each. Anything past four is dropped — at this size a fifth tile is
 * a smudge, and the story behind the tap has all of them anyway.
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

  if (tiles.length === 1) {
    return <View style={photoStyle}>{shot(tiles[0], 0)}</View>;
  }

  if (tiles.length === 2) {
    return (
      <View style={[...photoStyle, styles.mosaicColumn]}>
        {tiles.map((t, i) => shot(t, i))}
      </View>
    );
  }

  if (tiles.length === 3) {
    return (
      <View style={[...photoStyle, styles.mosaicColumn]}>
        {shot(tiles[0], 0)}
        <View style={styles.mosaicRow}>
          {shot(tiles[1], 1)}
          {shot(tiles[2], 2)}
        </View>
      </View>
    );
  }

  return (
    <View style={[...photoStyle, styles.mosaicColumn]}>
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
    // Matches the horizontal gap the cell's own padding makes, so the grid
    // reads as evenly spaced in both directions.
    rowGap: spacing.xs,
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: CELL_ASPECT,
    // A hair of air between neighbouring prints; the row gap matches it.
    paddingHorizontal: spacing.xs / 2,
  },
  press: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  tile: {
    flex: 1,
    borderRadius: CELL_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1,
    borderColor: colors.divider,
    // The corner is clipped on the layers themselves rather than with
    // `overflow: hidden` here, which would eat the shadow on iOS.
    ...shadows.soft,
  },
  // Today wears the same blacked-out border a photo-less day gets — no
  // separate ring treatment, so "today" reads the same whether or not it
  // has a photo yet.
  tileToday: {
    borderWidth: 2,
    borderColor: colors.ink,
  },
  photo: {
    ...absoluteFill,
    // Sits inside the tile's own 1px border, so its corner is tightened to
    // match — the same radius as the border's outer curve would bow out
    // past it and leave a flat sliver at each corner.
    borderRadius: CELL_RADIUS - 1,
    // The corner is clipped here rather than on each piece: a mosaic's inner
    // tiles are square, and only the block they make takes the tile's radius.
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  // Today's border is a step heavier, so the photo sits a step further in
  // and needs its corner tightened again to stay concentric with it.
  photoToday: {
    borderRadius: CELL_RADIUS - 2,
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
    borderRadius: CELL_RADIUS - 1,
    backgroundColor: colors.scrimPhoto,
  },
  scrimToday: {
    borderRadius: CELL_RADIUS - 2,
  },
  plain: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: CELL_RADIUS,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  // The fill carries the cell's edge on its own; a hairline around it only
  // draws a second, fainter box. Today's border still sits on top.
  plainFilled: {
    borderWidth: 0,
    backgroundColor: colors.surfaceSunken,
  },
  // Today, before it has a photo, is marked by darkening the cell's own
  // border rather than a separate disc behind the numeral.
  plainToday: {
    borderWidth: 2,
    borderColor: colors.ink,
  },
  // A sunken fill under the dash, so a missed day reads as a hole in the run
  // rather than one more quiet number.
  plainMissed: {
    backgroundColor: colors.surfaceSunken,
  },
  missDash: {
    position: 'absolute',
    width: MARK_SIZE,
    height: 2,
    bottom: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.field,
    transform: [{ rotate: '-40deg' }],
  },
  // Tucked into the bottom-right corner, over the scrim, ringed in white so
  // it holds its edge on a busy photo.
  markDone: {
    position: 'absolute',
    right: spacing.xs,
    bottom: spacing.xs,
    width: MARK_SIZE,
    height: MARK_SIZE,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  markCount: {
    position: 'absolute',
    right: spacing.xs / 2,
    bottom: spacing.xs,
    height: MARK_SIZE,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.pill,
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
});

export default CalendarMonth;
