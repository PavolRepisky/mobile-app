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
import { Headline } from './Headline';
import { Placeholder } from './Placeholder';
import { Text } from './Text';

/**
 * One month of the challenge, drawn as a seven-column grid: the day's cover
 * shot sits behind its number, so a month reads as the film you shot that
 * month rather than as a table of dates. Days you have not lived through yet
 * are numbers on their own, and today wears the filled disc a calendar always
 * puts on it.
 *
 * The month is the unit rather than the week because the challenge runs across
 * two or three of them and they are what people name a stretch of time by.
 */

const MONTH_NAMES = [
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

export interface CalendarDay {
  /** The day's cover shot. Fills the cell, with the numeral over it. */
  photo?: ImageSourcePropType | null;
  /** Seed for the drawn stand-in, where the day's shot is a placeholder. */
  seed?: string | null;
  /** Inside the challenge — dates before it starts or after it ends are not. */
  inChallenge?: boolean;
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
      {/* The year is set apart rather than repeated flat, so a scroll across a
          new-year boundary announces itself. */}
      <Headline size="headlineSm">{`${MONTH_NAMES[index]} *${year}*`}</Headline>

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
  const { photo, seed, inChallenge, today, onPress } = day;
  const hasShot = !!photo || !!seed;

  // The photographs are the page; every bare numeral stays quiet under them.
  // A day of the challenge with nothing on it still reads as a day you could
  // have shot, so it holds more weight than a date outside the run entirely.
  const numberColor = hasShot
    ? colors.inkInverse
    : inChallenge
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
