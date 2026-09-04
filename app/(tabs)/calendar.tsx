import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import {
  CalendarMonth,
  MONTH_NAMES,
  type CalendarDay,
  type DayShot,
} from '@/components/CalendarMonth';
import { ScreenScroll } from '@/components/Screen';
import { spacing } from '@/constants/theme';
import { useApp } from '@/hooks/useAppState';

/**
 * Your time in the app as a calendar, month by month from the one you
 * downloaded it in through to the one you are in now, with each day's cover
 * shot printed behind its number. Tapping a day you photographed plays that
 * day's story.
 *
 * The run of months belongs to the account rather than to whatever challenge
 * happens to be going: restarting, or switching to another challenge, must not
 * shorten the record. The photographs inside it still come from the challenge
 * you are on, because that is the only progress the app keeps.
 */
export default function CalendarScreen() {
  const router = useRouter();
  const { installedAt, tasks, progress, startDate, totalDays } = useApp();

  const months = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    /** Which challenge day a calendar date is, or null if it is outside it. */
    const dayNumber = (date: Date) => {
      // Rounded rather than floored: a daylight-saving shift inside the
      // challenge puts a fractional day between the two dates, which would
      // otherwise slide every date after it back by one.
      const n =
        Math.round((date.getTime() - startDate.getTime()) / 86_400_000) + 1;
      return n >= 1 && n <= totalDays ? n : null;
    };

    /**
     * Whether that day was closed out. The pictures only come up on a day
     * every task was finished, so a month shows at a glance which days were
     * actually seen through rather than merely photographed.
     */
    const developedOn = (day: number) => {
      const rows = progress[day] ?? {};
      return tasks.length > 0 && tasks.every((task) => rows[task.id]?.done);
    };

    /** Everything photographed that day, in checklist order. */
    const shotsFor = (day: number) => {
      const rows = progress[day] ?? {};
      return tasks.flatMap<DayShot>((task) => {
        const row = rows[task.id];
        if (row?.photo) return [{ photo: row.photo, seed: null }];
        if (row?.photoSeed) return [{ photo: null, seed: row.photoSeed }];
        return [];
      });
    };

    const out: { key: string; month: Date; days: Record<number, CalendarDay> }[] = [];
    const cursor = new Date(installedAt.getFullYear(), installedAt.getMonth(), 1);
    const last = new Date(today.getFullYear(), today.getMonth(), 1);

    while (cursor <= last) {
      const year = cursor.getFullYear();
      const month = cursor.getMonth();
      const length = new Date(year, month + 1, 0).getDate();
      const days: Record<number, CalendarDay> = {};

      for (let date = 1; date <= length; date += 1) {
        const on = new Date(year, month, date);
        const day = dayNumber(on);
        const shots = day === null ? [] : shotsFor(day);

        days[date] = {
          shots,
          developed: day !== null && developedOn(day),
          past: on <= today,
          today: on.getTime() === today.getTime(),
          label: shots.length
            ? `Day ${day}, ${shots.length} photo${shots.length > 1 ? 's' : ''}${
                day !== null && developedOn(day) ? '' : ', not finished'
              }. Opens this day's story.`
            : `${MONTH_NAMES[month]} ${date}. Nothing photographed.`,
          // Only a day with something on it answers to a tap; an empty square
          // opening an empty story would be a dead end.
          onPress:
            shots.length && day !== null
              ? () =>
                  router.push({
                    pathname: '/story',
                    params: { day: String(day) },
                  })
              : undefined,
        };
      }

      out.push({ key: `${year}-${month}`, month: new Date(year, month, 1), days });
      cursor.setMonth(month + 1);
    }

    return out;
  }, [installedAt, progress, tasks, startDate, totalDays, router]);

  return (
    <ScreenScroll tabBar bottomExtra={spacing['2xl']}>
      {months.map((entry) => (
        <CalendarMonth
          key={entry.key}
          month={entry.month}
          days={entry.days}
          style={styles.month}
        />
      ))}
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  month: {
    marginBottom: spacing['3xl'],
  },
});
