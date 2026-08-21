export interface ChallengeTask {
  id: string;
  label: string;
}

export interface Challenge {
  id: string;
  name: string;
  /** Bottom-left stamp on the sticker card. */
  stamp: string;
  joined: number;
  photoSeeds: readonly string[];
  tasks: readonly ChallengeTask[];
  defaultDays: number;
}

const task = (id: string, label: string): ChallengeTask => ({ id, label });

export const CHALLENGES: readonly Challenge[] = [
  {
    id: 'her75',
    name: 'Her 75 Challenge',
    stamp: 'Her 75 Challenge',
    joined: 20000,
    photoSeeds: ['her75-a', 'her75-b', 'her75-c', 'her75-d'],
    defaultDays: 75,
    tasks: [
      task('h1', 'Eat clean (no junk food and no alcohol) 🥗'),
      task('h2', 'Drink ONLY water 💧'),
      task('h3', 'Walk 10,000 steps a day 👟'),
      task('h4', 'One 45-minute workout per day 💪'),
      task('h5', 'Read any book (10 pages) or listen to a podcast (5+ min) 📖'),
    ],
  },
  {
    id: 'hard',
    name: '75 Day Hard',
    stamp: '75 Hard',
    joined: 10000,
    photoSeeds: ['hard-a', 'hard-b', 'hard-c', 'hard-d'],
    defaultDays: 75,
    tasks: [
      task('d1', 'Follow a strict diet (no cheat meals, no alcohol)'),
      task('d2', 'Drink water'),
      task('d3', 'Do two 45-minute workouts per day, one must be outside'),
      task('d4', 'Read 10 pages of a non-fiction/self-development book'),
      task('d5', 'Take a progress picture every day'),
    ],
  },
  {
    id: 'medium',
    name: '75 Medium',
    stamp: '75 Medium',
    joined: 5000,
    photoSeeds: ['med-a', 'med-b', 'med-c', 'med-d'],
    defaultDays: 75,
    tasks: [
      task('m1', 'Follow a diet with one flexible meal per week'),
      task('m2', 'Drink 3 litres of water'),
      task('m3', 'One 45-minute workout a day'),
      task('m4', 'Read 10 pages of a book'),
      task('m5', 'Take a progress picture every day'),
    ],
  },
  {
    id: 'soft',
    name: '75 Soft',
    stamp: '75 Soft',
    joined: 7500,
    photoSeeds: ['soft-a', 'soft-b', 'soft-c', 'soft-d'],
    defaultDays: 75,
    tasks: [
      task('s1', 'Eat clean (2 exceptions per week allowed)'),
      task('s2', 'Drink water'),
      task('s3', 'Walk 10,000 steps a day'),
      task('s4', 'Listen to a podcast (5+ min)'),
    ],
  },
];

export const CUSTOM_CHALLENGE: Challenge = {
  id: 'custom',
  name: 'Custom Challenge',
  stamp: 'Custom',
  joined: 0,
  photoSeeds: ['custom-a', 'custom-b', 'custom-c', 'custom-d'],
  defaultDays: 75,
  tasks: [task('c1', 'Task 1')],
};

export function challengeById(id: string): Challenge {
  return (
    CHALLENGES.find((c) => c.id === id) ??
    (id === CUSTOM_CHALLENGE.id ? CUSTOM_CHALLENGE : CHALLENGES[0])
  );
}
