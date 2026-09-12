import type { ImageSourcePropType } from 'react-native';

export interface ChallengeTask {
  id: string;
  label: string;
  /**
   * Slot in the sticky-note palette. Carried on the task rather than read off
   * its position, so dragging a task up the list takes its colour with it:
   * only the numeral, which is the position, changes. Assigned by `tinted`.
   */
  tint?: number;
}

export interface Challenge {
  id: string;
  name: string;
  /** Bottom-left stamp on the sticker card. */
  stamp: string;
  /** One or two sentences: what the challenge is and who it's for. */
  description: string;
  joined: number;
  photoSeeds: readonly string[];
  /**
   * Real photos a user picked while creating their own challenge, standing in
   * for `photoSeeds` wherever a challenge's strip is drawn. The presets never
   * set this — they only ever have seeds.
   */
  photos?: readonly ImageSourcePropType[];
  tasks: readonly ChallengeTask[];
  defaultDays: number;
}

const task = (id: string, label: string): ChallengeTask => ({ id, label });

export const CHALLENGES: readonly Challenge[] = [
  {
    id: 'her75',
    name: 'Get Fit for Summer',
    stamp: 'Her 75 Challenge',
    description:
      'A friendlier 75-day reset: clean eating, daily movement, and no alcohol — built for getting summer-ready without burning out.',
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
    name: 'No Excuses Challenge',
    stamp: '75 Hard',
    description:
      '75 days, zero cheat days. Two workouts, a strict diet, and a daily progress photo — the original mental-toughness challenge.',
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
    name: 'Balanced Reset',
    stamp: '75 Medium',
    description:
      '75 days of steady, sustainable habits: one flexible meal a week, daily movement, and a nightly read.',
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
    name: 'Fresh Start',
    stamp: '75 Soft',
    description:
      'A gentler 75 days: clean eating with a little room to breathe, daily walks, and time to unwind with a podcast.',
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
  description: 'Build your own 75-day challenge — pick the daily tasks that matter to you.',
  joined: 0,
  photoSeeds: ['custom-a', 'custom-b', 'custom-c', 'custom-d'],
  defaultDays: 75,
  tasks: [task('c1', 'Task 1')],
};

/**
 * Hands every task a palette slot, in list order, leaving any it already has
 * alone. Run once when a challenge's tasks become the live list, so the
 * colours start as the rotation the design wants and then stay put.
 */
export function tinted(tasks: readonly ChallengeTask[]): ChallengeTask[] {
  return tasks.map((t, i) => ({ ...t, tint: t.tint ?? i }));
}

/** The slot for a task appended to `list`: the next one along, never a repeat
 * of the one directly above it. */
export function nextTint(list: readonly ChallengeTask[]): number {
  return list.reduce((max, t) => Math.max(max, t.tint ?? -1), -1) + 1;
}

export function challengeById(id: string): Challenge {
  return (
    CHALLENGES.find((c) => c.id === id) ??
    (id === CUSTOM_CHALLENGE.id ? CUSTOM_CHALLENGE : CHALLENGES[0])
  );
}
