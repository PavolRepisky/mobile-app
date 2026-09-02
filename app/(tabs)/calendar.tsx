import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { CalendarMonth, type CalendarDay } from '@/components/CalendarMonth';
import { DateRange } from '@/components/DateRange';
import { Headline } from '@/components/Headline';
import { ScreenScroll } from '@/components/Screen';
import { Text } from '@/components/Text';
import { colors, spacing } from '@/constants/theme';
import { useApp } from '@/hooks/useAppState';
import { shortDate } from '@/lib/format';

/**
 * The challenge as a calendar: every month it runs across, with the day's
 * cover shot printed behind its number. It is the history the to-do list
 * leaves behind — tapping a day you photographed plays that day's story.
 *
 * Dates outside the challenge are still drawn, greyed: a month with its first
 * week missing reads as a broken grid rather than as a challenge that began
 * mid-week.
 */
export default function CalendarScreen() {
  const router = useRouter();
  const { challenge, tasks, progress, startDate, endDate, totalDays, currentDay } =
    useApp();

  const months = useMemo(() => {
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
    const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const last = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

    while (cursor <= last) {
      const year = cursor.getFullYear();
      const month = cursor.getMonth();
      const length = new Date(year, month + 1, 0).getDate();
      const days: Record<number, CalendarDay> = {};

      for (let date = 1; date <= length; date += 1) {
        const day = dayNumber(new Date(year, month, date));
        if (day === null) {
          days[date] = {};
          continue;
        }

        const shot = cover(day);
        days[date] = {
          photo: shot?.photo ?? null,
          seed: shot?.seed ?? null,
          inChallenge: true,
          today: day === currentDay,
          label: shot
            ? `Day ${day}. Opens this day's story.`
            : `Day ${day}. Nothing photographed.`,
          // Only a day with something on it answers to a tap; an empty square
          // opening an empty story would be a dead end.
          onPress: shot
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
  }, [progress, tasks, startDate, endDate, totalDays, currentDay, router]);

  const photographed = useMemo(
    () =>
      Object.values(progress).filter((rows) =>
        Object.values(rows).some((row) => row.photo || row.photoSeed),
      ).length,
    [progress],
  );

  return (
    <ScreenScroll tabBar bottomExtra={spacing['2xl']}>
      <View style={styles.header}>
        <Headline size="title">{challenge.name}</Headline>

        <View style={styles.meta}>
          <DateRange
            from={shortDate(startDate)}
            to={shortDate(endDate)}
            variant="label"
            color={colors.inkMuted}
          />
          <Text variant="label" color={colors.inkMuted} style={styles.dot}>
            ·
          </Text>

          <Text variant="label" color={colors.inkMuted}>
            {`${photographed} of ${totalDays} days`}
          </Text>
        </View>
      </View>

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
  header: {
    marginBottom: spacing['2xl'],
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    // The challenge name above it is a centred headline, so the line reading
    // it out has to hang under the middle of it rather than off to one side.
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  dot: {
    marginHorizontal: spacing.sm,
  },
  month: {
    marginBottom: spacing['3xl'],
  },
});
