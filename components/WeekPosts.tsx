import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useMemo } from 'react';

import { colors, layout, radii } from '@/constants/theme';
import { orderBySlot, useApp } from '@/hooks/useAppState';
import { addDays } from '@/lib/format';
import { PhotoCollage, type CollageCell } from './PhotoCollage';
import { Text } from './Text';

export interface WeekPostsDay {
  key: string;
  /** The weekday's letter: "M", "T"… */
  letter: string;
  /** Day of the month, shown on a day still to come. */
  date: number;
  today?: boolean;
  /** That day's photos, in task order — `null` for a day still to come. */
  cells: readonly CollageCell[] | null;
}

export interface WeekPostsProps {
  days: readonly WeekPostsDay[];
  /** Each day's square, in points. */
  size?: number;
  /** The weekday letter over the square rather than under it. */
  lettersAbove?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** The ring round today's square, and the air between it and the post. */
const TODAY_RING = 2;

/**
 * The week as a row of little posts: each day that has been is its own photo
 * grid, today sits in a ring filling up as it goes, and the days still to
 * come are blank squares carrying only their date — so the week reads as
 * what the posts on Community will be, one a day.
 *
 * The seven sit in one long band of the fill grey with the days to come cut
 * out of it in white, so the week holds together as a single strip rather
 * than seven loose tiles on the page.
 */
export function WeekPosts({ days, size = 40, lettersAbove, style }: WeekPostsProps) {
  return (
    <View style={[styles.row, style]}>
      {days.map((day) => {
        const letter = (
          <Text variant="badge" color={day.today ? colors.ink : colors.inkMuted}>
            {day.letter}
          </Text>
        );
        const square = day.cells ? (
          day.today ? (
            <View style={[styles.todayRing, { width: size, height: size }]}>
              <PhotoCollage cells={day.cells} bare radius={radii.sm - TODAY_RING * 2} style={styles.fill} />
            </View>
          ) : (
            <PhotoCollage cells={day.cells} bare radius={radii.sm} style={{ width: size }} />
          )
        ) : (
          <View style={[styles.future, { width: size, height: size }]}>
            <Text variant="badge" color={colors.inkGhost}>
              {day.date}
            </Text>
          </View>
        );
        return (
          <View key={day.key} style={styles.day}>
            {lettersAbove ? letter : null}
            {square}
            {lettersAbove ? null : letter}
          </View>
        );
      })}
    </View>
  );
}

const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * This calendar week, Monday first, as the row's days: each weekday is turned
 * back into a challenge day by counting from the start date, so a day before
 * the start or past the end shows as a blank square like one still to come.
 */
export function useWeekPostsDays(): WeekPostsDay[] {
  const { currentDay, startDate, totalDays, tasks, progress } = useApp();
  return useMemo(() => {
    const today = addDays(startDate, currentDay - 1);
    const offset = (today.getDay() + 6) % 7;
    return LETTERS.map((letter, i) => {
      const day = currentDay - offset + i;
      const inChallenge = day >= 1 && day <= totalDays;
      const entries = progress[day] ?? {};
      return {
        key: String(i),
        letter,
        date: addDays(today, i - offset).getDate(),
        today: day === currentDay,
        cells:
          inChallenge && day <= currentDay
            ? orderBySlot(tasks, entries).map((task) => ({
                key: task.id,
                photo: entries[task.id]?.done ? entries[task.id]?.photo : null,
                seed: entries[task.id]?.done ? entries[task.id]?.photoSeed : null,
              }))
            : null,
      };
    });
  }, [currentDay, startDate, totalDays, tasks, progress]);
}

export default WeekPosts;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    padding: layout.inline,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceSunken,
  },
  day: {
    alignItems: 'center',
    gap: layout.line + layout.line / 2,
  },
  todayRing: {
    padding: TODAY_RING,
    borderRadius: radii.sm,
    borderWidth: TODAY_RING,
    borderColor: colors.ink,
  },
  fill: {
    flex: 1,
  },
  future: {
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
