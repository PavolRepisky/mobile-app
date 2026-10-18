import { challengeById } from '@/data/challenges';
import { PRESET_PHOTOS } from '@/data/content';
import type { PastRun } from '@/lib/backend/social';
import { addDays } from '@/lib/format';
import { startOfToday } from '@/lib/round';

/** Every bundled preset photo, the pool a fake day's shots are dealt from —
 * real images only, not the seeds drawn as stand-ins. */
const POOL = Object.values(PRESET_PHOTOS)
  .flat()
  .filter((photo): photo is Exclude<typeof photo, string> => typeof photo !== 'string');

/** The prefix every made-up era's membership carries, so what's left on one
 * can be told apart from what the server can store. */
const FAKE_PREFIX = 'fake-';

/** Whether a membership is one of these made-up eras — no row the server
 * knows, so a like or a comment on it has nowhere to be saved. */
export const isFakeRun = (membershipId: string) => membershipId.startsWith(FAKE_PREFIX);

/**
 * One past era made up on the phone: the preset `id`, run for `totalDays`
 * from `startDate`, with every task photographed on each of `postedDays`.
 */
function fakeRun(
  id: string,
  status: PastRun['status'],
  startDate: Date,
  totalDays: number,
  lastDay: number,
  postedDays: readonly number[],
): PastRun {
  const challenge = challengeById(id);
  const today = startOfToday();
  return {
    membershipId: `${FAKE_PREFIX}${id}`,
    challenge: { id: challenge.id, name: challenge.name },
    status,
    startDate,
    totalDays,
    taskCount: challenge.tasks.length,
    lastDay,
    dayToday: Math.round((today.getTime() - startDate.getTime()) / 86_400_000) + 1,
    days: [...postedDays]
      .sort((a, b) => b - a)
      .map((day) => ({
        day,
        tasks: challenge.tasks.map((task, i) => ({
          label: task.label,
          done: true,
          time: '19:30',
          photo: POOL[(day * 3 + i * 7) % POOL.length],
        })),
      })),
  };
}

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

/**
 * Three eras behind the account, for seeing a profile with a history while
 * it has none of its own: one finished, one that ran out of lives, one left.
 * Development builds only, switched by `FAKE_PAST_ERAS` in `useSocial`;
 * nothing of them reaches the server.
 */
export function fakePastRuns(): PastRun[] {
  const today = startOfToday();
  return [
    fakeRun('medium', 'finished', addDays(today, -44), 30, 30, range(1, 30)),
    fakeRun('steps', 'lost', addDays(today, -80), 30, 14, range(1, 14).filter((d) => d % 5 !== 0)),
    fakeRun('pages', 'left', addDays(today, -110), 21, 9, range(1, 6)),
  ];
}
