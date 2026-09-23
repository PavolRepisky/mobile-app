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

/** The five browse filters on the Challenges list. */
export type ChallengeCategory = 'Fitness' | 'Health' | 'Mindset' | 'Lifestyle' | 'Study';

export interface Challenge {
  id: string;
  name: string;
  /** Bottom-left stamp on the sticker card. */
  stamp: string;
  /** One or two sentences: what the challenge is and who it's for. */
  description: string;
  /**
   * Which of the browse filters this challenge sits under. Unset for a
   * custom challenge — a hand-built list of tasks has no taxonomy of its own
   * to fall into.
   */
  category?: ChallengeCategory;
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
    category: 'Fitness',
    joined: 20000,
    photoSeeds: ['her75-a', 'her75-b', 'her75-c', 'her75-d'],
    defaultDays: 75,
    tasks: [
      task('h1', 'Eat clean'),
      task('h2', 'Drink only water'),
      task('h3', 'Walk 10k steps'),
      task('h4', 'Work out 45 min'),
      task('h5', 'Read 10 pages'),
    ],
  },
  {
    id: 'hard',
    name: 'No Excuses Challenge',
    stamp: '75 Hard',
    description:
      '75 days, zero cheat days. Two workouts, a strict diet, and a daily progress photo — the original mental-toughness challenge.',
    category: 'Health',
    joined: 10000,
    photoSeeds: ['hard-a', 'hard-b', 'hard-c', 'hard-d'],
    defaultDays: 75,
    tasks: [
      task('d1', 'Strict diet'),
      task('d2', 'Drink water'),
      task('d3', 'Two workouts, one outside'),
      task('d4', 'Read 10 pages'),
      task('d5', 'Progress photo'),
    ],
  },
  {
    id: 'medium',
    name: 'Balanced Reset',
    stamp: '75 Medium',
    description:
      '75 days of steady, sustainable habits: one flexible meal a week, daily movement, and a nightly read.',
    category: 'Mindset',
    joined: 5000,
    photoSeeds: ['med-a', 'med-b', 'med-c', 'med-d'],
    defaultDays: 75,
    tasks: [
      task('m1', 'Eat well'),
      task('m2', 'Drink 3L water'),
      task('m3', 'Work out 45 min'),
      task('m4', 'Read 10 pages'),
      task('m5', 'Progress photo'),
    ],
  },
  {
    id: 'soft',
    name: 'Fresh Start',
    stamp: '75 Soft',
    description:
      'A gentler 75 days: clean eating with a little room to breathe, daily walks, and time to unwind with a podcast.',
    category: 'Lifestyle',
    joined: 7500,
    photoSeeds: ['soft-a', 'soft-b', 'soft-c', 'soft-d'],
    defaultDays: 75,
    tasks: [
      task('s1', 'Eat mostly clean'),
      task('s2', 'Drink water'),
      task('s3', 'Walk 10k steps'),
      task('s4', 'Listen to a podcast'),
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
