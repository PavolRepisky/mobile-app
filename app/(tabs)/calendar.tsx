import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import {
  CalendarMonth,
  MONTH_NAMES,
  type CalendarDay,
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
 * shorten the record. The challenge itself is marked *inside* that record — an
 * ink rule under the stretch of days it covers, named where it opens — so it
 * reads as a season of your year rather than as the whole page.
 *
 * Only the challenge you are on is drawn. The app keeps no history of finished
 * ones, so there is nothing else to rule off yet.
 */
export default function CalendarScreen() {
  const router = useRouter();
  const { challenge, installedAt, tasks, progress, startDate, totalDays } =
    useApp();

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

    /** The first shot of the day, in checklist order — the day's cover. */
    const cover = (day: number) => {
      const rows = progress[day] ?? {};
      for (const task of tasks) {
        const row = rows[task.id];
        if (row?.photo) return { photo: row.photo, seed: null };
        if (row?.photoSeed) return { photo: null, seed: row.photoSeed };
      }
      return null;
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
        const shot = day === null ? null : cover(day);

        days[date] = {
          photo: shot?.photo ?? null,
          seed: shot?.seed ?? null,
          past: on <= today,
          today: on.getTime() === today.getTime(),
          // The run is the whole challenge, not just the part already lived:
          // the rule under it is what tells you how much is still to come.
          inChallenge: day !== null,
          runStart: day === 1,
          label: shot
            ? `Day ${day}. Opens this day's story.`
            : `${MONTH_NAMES[month]} ${date}. Nothing photographed.`,
          // Only a day with something on it answers to a tap; an empty square
          // opening an empty story would be a dead end.
          onPress:
            shot && day !== null
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
          runLabel={challenge.name}
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
