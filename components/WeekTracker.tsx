import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, spacing } from '@/constants/theme';
import { Text } from './Text';

/**
 * The week at a glance, one row per task and one column per weekday: a habit
 * tracker laid over the challenge's own progress. It sits above the Tasks
 * tab's photo mosaic as the quiet, countable version of the same record — the
 * mosaic shows what today looked like, this shows whether the week held.
 *
 * Weeks start on Monday, the same count the calendar's month grid uses, and
 * today wears a black ring the way its calendar cell wears a black border.
 */

/** One letter a column: seven three-letter names don't fit beside a label. */
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** The drawn disc for one task on one day, and the height of every line in
 * the grid. Big enough to tick at a glance, small enough that seven sit
 * comfortably beside the task names. */
const CELL = 24;

/**
 * - `done` the task was ticked that day
 * - `today` today, still open
 * - `missed` a day gone by with the task left open
 * - `future` a challenge day not reached yet
 * - `outside` before the challenge started or after it ends — nothing drawn
 */
export type WeekCellStatus = 'done' | 'today' | 'missed' | 'future' | 'outside';

export interface WeekTrackerRow {
  id: string;
  label: string;
  /** Seven entries, Monday first. */
  days: readonly WeekCellStatus[];
}

export interface WeekTrackerProps {
  rows: readonly WeekTrackerRow[];
  /** 0 = Monday. Today's column. */
  todayIndex: number;
  /**
   * 0 = Monday. The column whose weekday letter is picked out in ink — the
   * day the grid below is showing. Defaults to today.
   */
  selectedIndex?: number;
  style?: StyleProp<ViewStyle>;
}

export function WeekTracker({
  rows,
  todayIndex,
  selectedIndex = todayIndex,
  style,
}: WeekTrackerProps) {
  // Laid out in columns rather than rows: the label column is only as wide as
  // its longest task, and the seven weekdays share whatever is left evenly —
  // so the dots start right after the names instead of being pushed to the
  // far edge. Every line is the same height, so the columns stay in step.
  return (
    <View style={[styles.root, style]}>
      <View style={styles.labels}>
        <View style={styles.line} />
        {rows.map((row) => (
          <View key={row.id} style={styles.line}>
            <Text variant="label" color={colors.inkSoft} numberOfLines={1}>
              {row.label}
            </Text>
          </View>
        ))}
      </View>

      {WEEKDAYS.map((letter, i) => (
        <View key={i} style={styles.day}>
          <View style={styles.line}>
            <Text
              variant={i === selectedIndex ? 'labelBold' : 'micro'}
              color={i === selectedIndex ? colors.ink : colors.inkMuted}
              center
            >
              {letter}
            </Text>
          </View>
          {rows.map((row) => (
            <View key={row.id} style={styles.line}>
              <Dot status={row.days[i]} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function Dot({ status }: { status: WeekCellStatus }) {
  if (status === 'outside') return null;

  // Ink for a day kept, the same solid ink as the Tasks tab's own disc; a missed
  // day is a muted blank rather than anything red — the tracker records, it
  // doesn't scold.
  return (
    <View style={[styles.dot, dotStyles[status]]}>
      {status === 'done' ? (
        <Ionicons name="checkmark" size={14} color={colors.inkInverse} />
      ) : null}
    </View>
  );
}

export default WeekTracker;

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
  },
  labels: {
    gap: spacing.sm,
    marginRight: spacing.lg,
    // Hugs its longest label, but never so wide it squeezes the week out.
    maxWidth: '45%',
  },
  day: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
  },
  line: {
    height: CELL,
    justifyContent: 'center',
  },
  dot: {
    width: CELL,
    height: CELL,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const dotStyles = StyleSheet.create({
  done: {
    backgroundColor: colors.ink,
  },
  today: {
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
  missed: {
    backgroundColor: colors.surfaceMuted,
  },
  // A hairline ring: a day that's coming, still empty, lighter than one that
  // has already gone by.
  future: {
    borderWidth: 1,
    borderColor: colors.dividerStrong,
  },
  outside: {},
});
