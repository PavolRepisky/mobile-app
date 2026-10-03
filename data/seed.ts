import { CHALLENGES, type ChallengeTask } from '@/data/challenges';
import type { Profile, Progress, TaskPhoto } from '@/hooks/useAppState';
import { addDays } from '@/lib/format';
import { startOfToday } from '@/lib/round';

/**
 * The demo account the app opens on — Day 5 of Get Fit for Summer with four
 * days of history, the state the reference screenshots were taken in. The
 * provider in `useAppState` starts from here and goes back here on reset;
 * once there's a backend, this is what the signed-in account's own data
 * replaces, and nothing in the provider has to know.
 */

/** Today's day of the seeded round. */
const SEED_DAY = 5;

export const SEED_CHALLENGE = CHALLENGES[0];

/** Day 1 of the seeded round, counted back from today so it's always Day 5. */
export function seedStartDate(): Date {
  return addDays(startOfToday(), -(SEED_DAY - 1));
}

export const SEED_PROFILE: Profile = {
  name: 'Julia',
  handle: '@julia_575',
  bio: 'clean plates, daily walks, no excuses',
  avatarSeed: null,
  // Face-forward and not used as anyone else's avatar, so the crop reads as
  // "you" without colliding with a friend's or an author's photo.
  avatar: require('../assets/ambassadors/amb-3.jpg'),
};

/** The seeded account's own captions for the days it has already posted —
 * today, still in progress, has none yet. */
export const SEED_CAPTIONS: Readonly<Record<number, string>> = {
  1: 'Day one done. Slow start, but I showed up.',
  2: 'Legs are sore and the bottle is empty. Counting that as a win.',
  3: 'Sunday meal prep paid off today.',
  4: "Almost skipped the walk. So glad I didn't.",
};

/**
 * The history behind today, day -> task id -> shot. Photos already bundled for
 * the feed and the challenge tiles are reused here rather than
 * shipping a second copy of the same kind of picture: what each one shows
 * matches the task it is filed under, which is what the drawn stand-ins could
 * never do. Days list three of the five tasks, the way a real week looks.
 */
const SEED_DAY_PHOTOS: Readonly<Record<number, Readonly<Record<string, TaskPhoto>>>> = {
  1: {
    h1: require('../assets/wall/eat/spinach-eggs-avocado-toast.jpg'),
    h3: require('../assets/challenges/soft/sunset-walk.jpg'),
    h4: require('../assets/wall/workouts/home-mat-core.jpg'),
  },
  2: {
    h1: require('../assets/wall/eat/sesame-chicken-rice-bowl.jpg'),
    h4: require('../assets/wall/workouts/gym-plank.jpg'),
    h5: require('../assets/challenges/medium/book-in-bed.jpg'),
  },
  3: {
    h1: require('../assets/wall/eat/salmon-rice-asparagus.jpg'),
    h2: require('../assets/challenges/medium/infused-water.jpg'),
    h3: require('../assets/wall/workouts/treadmill-incline-walk.jpg'),
  },
  4: {
    h1: require('../assets/wall/eat/berry-watermelon-plate.jpg'),
    h4: require('../assets/challenges/medium/outdoor-run.jpg'),
    h5: require('../assets/feed/posts/park-bench-reading.jpg'),
  },
};

/**
 * Builds a few days of plausible history so the profile grid and calendar are
 * not empty on first launch.
 */
export function seedProgress(tasks: readonly ChallengeTask[]): Progress {
  const progress: Progress = {};

  for (let day = 1; day < SEED_DAY; day += 1) {
    progress[day] = {};
    const shots = SEED_DAY_PHOTOS[day];
    tasks.forEach((t, i) => {
      // The bundled shots are keyed to this challenge's tasks; a challenge
      // with ids of its own falls back to the drawn stand-ins.
      const photo = shots?.[t.id] ?? null;
      progress[day][t.id] = {
        done: true,
        time: `${7 + i}:${(12 + i * 7) % 60}`.padEnd(5, '0') + 'am',
        photo,
        photoSeed: !shots && i < 3 ? `day${day}-${t.id}` : null,
      };
    });
  }

  // Today is left with nothing seeded: `useDayProgress` already defaults a
  // day with no entry to every task open, so the Tasks tab greets a fresh
  // launch with a clean slate rather than someone else's shots.

  return progress;
}
