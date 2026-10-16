import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  useColorScheme,
  type StyleProp,
  type ViewStyle,
  type ColorValue,
} from 'react-native';

import { colors, layout, radii, colorsFor, shadows } from '@/constants/theme';
import { challengeStrip } from '@/data/content';
import { DAY_MS } from '@/lib/round';
import { accentAt } from './TaskRing';
import { Text } from './Text';


/** The challenge's own photo leading its card — a list row's thumbnail, so
 * the challenge looks the same here as where it was joined. */
const CHALLENGE_THUMB = 40;
/** The arrow between the round's first and last date: Quicksand has no
 * arrow glyph, so it's an icon at the size of the line's lowercase. */
const RANGE_ARROW = 12;

/** Days per row of the squares: a 75-day run folds into five even rows, a
 * 30-day one into two. */
const SQUARES_PER_ROW = 15;
/** A day square's corner. The squares come out around 17pt, where even the
 * smallest radius token rounds them into dots. */
const SQUARE_RADIUS = 4;
/** Today's ring around its square — the calendar's today cell, scaled down. */
const SQUARE_TODAY_BORDER = 2;

/** How one day of the run is drawn. */
type SquareState = 'done' | 'partial' | 'missed' | 'today' | 'ahead';

/** What the card needs of one day: how many tasks got done, and whether any
 * photo came of it. */
export interface RunDay {
  done: number;
  shots: number;
}

export interface ChallengeRunProps {
  challenge: { id: string; name: string };
  startDate: Date;
  /** The run's day today; 0 before Day 1, when every square is still to
   * come and the card says when it starts instead. */
  currentDay: number;
  totalDays: number;
  taskCount: number;
  /** A day's record, or null where there's none to show — left blank rather
   * than marked missed. */
  dayOf: (day: number) => RunDay | null;
  /**
   * `ink` is the solid block that stands out on its page. `quiet` is a
   * white card on the card shadow, for a page where the run is a footnote
   * rather than the lead: the type turns ink, the days still to come grey,
   * today's ring ink.
   */
  tone?: 'ink' | 'quiet';
  style?: StyleProp<ViewStyle>;
}

/**
 * One day of the challenge as a square, on the card's ink: done in the
 * accent for where it sits in the run, half-filled for a day that got photos
 * but fell short, the muted grey for a day with nothing, a white ring for
 * today and a faint white wash for everything still to come.
 */
function DaySquare({
  state,
  color,
  size,
  quiet,
}: {
  state: SquareState;
  color: string;
  size: number;
  quiet?: boolean;
}) {
  const box = { width: size, height: size };
  const scheme = colorsFor(useColorScheme());
  const rest = quiet ? scheme.surfaceSunken : scheme.onInkFill;
  if (state === 'partial') {
    // Cut corner to corner, so half a day reads as half a square rather
    // than as a lighter shade of a whole one.
    return (
      <LinearGradient
        colors={[color, color, rest, rest]}
        locations={[0, 0.5, 0.5, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.square, box]}
      />
    );
  }
  return (
    <View
      style={[
        styles.square,
        quiet && styles.squareQuiet,
        box,
        state === 'done' && { backgroundColor: color },
        state === 'missed' && (quiet ? styles.squareMissedQuiet : styles.squareMissed),
        state === 'today' && (quiet ? styles.squareTodayQuiet : styles.squareToday),
      ]}
    />
  );
}

const shortDate = (date: Date) =>
  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const dateLabel = (date: Date) =>
  date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

/**
 * The challenge you're on, drawn as the whole run — one square a day — on a
 * block of ink (or, `quiet`, a white card), with its name and dates over
 * it — at the foot of the Tasks tab.
 */
export function ChallengeRun({
  challenge,
  startDate,
  currentDay,
  totalDays,
  taskCount,
  dayOf,
  tone = 'ink',
  style,
}: ChallengeRunProps) {
  const quiet = tone === 'quiet';
  const [squaresWidth, setSquaresWidth] = useState(0);

  const endDate = new Date(startDate.getTime() + (totalDays - 1) * DAY_MS);
  const photo = challengeStrip(challenge.id)[0];

  const squares = useMemo(
    () =>
      Array.from({ length: totalDays }, (_, index): SquareState => {
        const day = index + 1;
        if (day === currentDay) return 'today';
        if (day > currentDay) return 'ahead';
        const record = dayOf(day);
        if (!record) return 'ahead';
        if (record.done >= taskCount) return 'done';
        return record.shots ? 'partial' : 'missed';
      }),
    [totalDays, currentDay, dayOf, taskCount],
  );

  // Fifteen across, cut to whatever width the card leaves — worked out from
  // the measured row rather than a percentage, which `gap` would push over.
  const squareSize =
    squaresWidth > 0 ? (squaresWidth - layout.grid * (SQUARES_PER_ROW - 1)) / SQUARES_PER_ROW : 0;

  return (
    // Only to read, not a way off the page: the tasks are where the day is
    // done, so the run sits above them without pulling you elsewhere.
    <View
      accessible
      accessibilityLabel={`${challenge.name}, ${currentDay < 1 ? 'starts' : `day ${currentDay} of ${totalDays},`} ${dateLabel(startDate)} to ${dateLabel(endDate)}`}
      style={[styles.card, quiet && styles.cardQuiet, style]}
    >
      <View style={styles.row}>
        <Image source={photo} style={styles.thumb} contentFit="cover" />
        <View style={styles.text}>
          <Text variant="copyBold" color={quiet ? colors.ink : colors.inkInverse} numberOfLines={1}>
            {challenge.name}
          </Text>
          <View style={styles.meta}>
            <Text variant="meta" color={colors.inkMuted} numberOfLines={1}>
              {/* Before Day 1 there's no day to count yet — only when it
                  begins, and every square still to come. */}
              {currentDay < 1
                ? `${totalDays} days · starts ${shortDate(startDate)}`
                : `Day ${currentDay} of ${totalDays} · ${shortDate(startDate)}`}
            </Text>
            <Ionicons name="arrow-forward" size={RANGE_ARROW} color={colors.inkMuted} />
            <Text variant="meta" color={colors.inkMuted} numberOfLines={1}>
              {shortDate(endDate)}
            </Text>
          </View>
        </View>
      </View>

      {/* Read out once, in the card's own label — seventy-five squares one
          by one is noise to a screen reader. */}
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        onLayout={(e) => setSquaresWidth(e.nativeEvent.layout.width)}
        style={styles.squares}
      >
        {squareSize > 0
          ? squares.map((state, index) => (
              <DaySquare
                key={index}
                state={state}
                // Coloured by where the day sits in the run, the way the
                // profile ring's sweep is read off where a segment sits —
                // peach early on, lavender only near the end.
                color={accentAt((index + 0.5) / squares.length)}
                size={squareSize}
                quiet={quiet}
              />
            ))
          : null}
      </View>
    </View>
  );
}

export default ChallengeRun;

const styles = StyleSheet.create({
  // Ink rather than the fill grey, so the run you're on is the one solid
  // block on the page; the accent squares read brightest against it.
  card: {
    padding: layout.card,
    gap: layout.heading,
    borderRadius: radii.card,
    backgroundColor: colors.ink,
  },
  // A white card lifted on the card shadow — clear of the grey task rows
  // above it, without the ink block's weight.
  cardQuiet: {
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.inline,
  },
  thumb: {
    width: CHALLENGE_THUMB,
    height: CHALLENGE_THUMB,
    borderRadius: radii.sm,
  },
  text: {
    flex: 1,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.line,
  },
  squares: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: layout.grid,
  },
  square: {
    borderRadius: SQUARE_RADIUS,
    backgroundColor: colors.onInkFill,
  },
  squareMissed: {
    backgroundColor: colors.inkMuted,
  },
  // On the white: days to come the fill grey, a day with nothing the
  // not-yet grey.
  squareQuiet: {
    backgroundColor: colors.surfaceSunken,
  },
  squareMissedQuiet: {
    backgroundColor: colors.inkGhost,
  },
  squareTodayQuiet: {
    borderWidth: SQUARE_TODAY_BORDER,
    borderColor: colors.ink,
  },
  squareToday: {
    borderWidth: SQUARE_TODAY_BORDER,
    borderColor: colors.inkInverse,
  },
});
