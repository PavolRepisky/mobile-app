import { useMemo } from 'react';

import type { PhotoSource } from '@/components/PhotoStrip';
import { challengeById, type ChallengeCategory } from '@/data/challenges';
import { challengeStrip, DISCOVER } from '@/data/content';
import { useApp } from '@/hooks/useAppState';
import { localDay, roundState } from '@/lib/round';

/**
 * Where a round stands, because what someone is looking for depends on it: a
 * round they can still join, one under way, or one that's over. Starting soon
 * comes first — it's the only kind anyone can join.
 */
export type Phase = 'upcoming' | 'active' | 'finished';

export const PHASES: readonly { key: Phase; label: string }[] = [
  { key: 'upcoming', label: 'Starting soon' },
  { key: 'active', label: 'Under way' },
  { key: 'finished', label: 'Finished' },
];

/** Every category, in the order Browse lays its tiles out. */
export const CATEGORIES: readonly ChallengeCategory[] = [
  'Fitness',
  'Health',
  'Mindset',
  'Lifestyle',
  'Study',
];

/** A topic's one line under its name on the topic page — what kind of days
 * a challenge filed there asks for, so the photo isn't left to explain it. */
export const CATEGORY_BLURBS: Record<ChallengeCategory, string> = {
  Fitness: 'Workouts, steps and moving every day',
  Health: 'Eating well, water and sleep',
  Mindset: 'Journaling, reading and quiet time',
  Lifestyle: 'Routines, rest and small daily habits',
  Study: 'Reading, revision and focus time',
};

/**
 * The lengths people choose between, as the search page offers them:
 * nobody weighs 28 days against 30, only a few weeks against a month
 * against the full 75.
 */
export type LengthBucket = 'weeks' | 'month' | 'long';

export const LENGTHS: readonly { key: LengthBucket; label: string }[] = [
  { key: 'weeks', label: '1–3 weeks' },
  { key: 'month', label: '30 days' },
  { key: 'long', label: '75 days' },
];

export function lengthBucket(days: number): LengthBucket {
  return days <= 21 ? 'weeks' : days <= 45 ? 'month' : 'long';
}

/** One challenge as the browse screens show it — the one you're on and every
 * listed round in the same shape, so nothing marks yours out as a different
 * kind of thing. */
export interface ChallengeCard {
  id: string;
  title: string;
  photos: readonly PhotoSource[];
  category?: ChallengeCategory;
  tasksCount: number;
  /** The daily tasks' labels, so a search for "walk" finds the challenge
   * that has you walking even when its name doesn't say so. */
  tasks: readonly string[];
  /** The challenge you're on — shown as yours rather than as one to join. */
  mine: boolean;
  /** Undefined for a custom challenge with no listing of its own — the
   * members count drops out rather than showing a number nothing backs. */
  members?: number;
  /** Of `members`, how many are still in the running — only once it's under
   * way, and only where the listing counts it. */
  stillGoing?: number;
  /** How many days the challenge runs. */
  days: number;
  /** Day 1 of the round; undefined for a custom challenge, which has no
   * shared round to count from. */
  start?: Date;
  /** "Starts in 4 days", "Day 25 of 75", "Finished" — or "N days left" on a
   * custom challenge of your own. */
  statusLabel: string;
  /** The shortest form of the same, for the end of a list row. */
  shortStatus: string;
  phase: Phase;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function roundStatus(
  start: Date,
  days: number,
): Pick<ChallengeCard, 'phase' | 'statusLabel' | 'shortStatus'> {
  const state = roundState(start, days);
  if (state.kind === 'upcoming') {
    return {
      phase: 'upcoming',
      statusLabel:
        state.daysUntil === 1 ? 'Starts tomorrow' : `Starts in ${state.daysUntil} days`,
      shortStatus: `${MONTHS[start.getMonth()]} ${start.getDate()}`,
    };
  }
  if (state.kind === 'running') {
    return {
      phase: 'active',
      statusLabel: `Day ${state.day} of ${days}`,
      shortStatus: `Day ${state.day}`,
    };
  }
  return { phase: 'finished', statusLabel: 'Finished', shortStatus: 'Finished' };
}

/**
 * Every challenge the browse screens can show: one card for the challenge
 * you're on, built off live app state rather than the static table — a custom
 * challenge has no listing for `challengeById` to find — plus one per listed
 * round.
 */
export function useChallengeCards(): readonly ChallengeCard[] {
  const { challenge, tasks, currentDay, totalDays } = useApp();

  return useMemo<ChallengeCard[]>(() => {
    const listing = DISCOVER.find((section) => section.id === challenge.id);
    const daysLeft = Math.max(totalDays - currentDay, 0);
    // Filed by its listing's round like every other card, so a round that
    // has ended sits under Finished even while it's the one you're on.
    const mineStart = listing ? localDay(listing.startDate) : undefined;
    const mineStatus = mineStart
      ? roundStatus(mineStart, totalDays)
      : {
          phase: 'active' as const,
          statusLabel: `${daysLeft} days left`,
          shortStatus: `${daysLeft} left`,
        };
    const mine: ChallengeCard = {
      id: challenge.id,
      title: challenge.name,
      photos: challengeStrip(challenge.id),
      category: challenge.category,
      tasksCount: tasks.length,
      tasks: tasks.map((t) => t.label),
      mine: true,
      members: listing?.members,
      stillGoing: listing?.stillGoing,
      days: totalDays,
      start: mineStart,
      ...mineStatus,
    };

    const listed = DISCOVER.filter((section) => section.id !== challenge.id).map(
      (section): ChallengeCard => {
        const info = challengeById(section.id);
        const start = localDay(section.startDate);
        return {
          id: section.id,
          title: section.title,
          photos: section.photos,
          category: info.category,
          tasksCount: info.tasks.length,
          tasks: info.tasks.map((t) => t.label),
          mine: false,
          members: section.members,
          stillGoing: section.stillGoing,
          days: info.defaultDays,
          start,
          ...roundStatus(start, info.defaultDays),
        };
      },
    );

    return [mine, ...listed];
  }, [challenge, tasks, currentDay, totalDays]);
}

const terms = (query: string) => query.trim().toLowerCase().split(/\s+/).filter(Boolean);

/** Each word of the query has to appear somewhere in the name, the topic or
 * one of the tasks, in any order — "excuses no" still finds "No Excuses
 * Challenge", and "walk" finds every challenge with a walk in its day. */
export function matchesQuery(card: ChallengeCard, query: string): boolean {
  const haystack = [card.title, card.category ?? '', ...card.tasks].join(' ').toLowerCase();
  return terms(query).every((term) => haystack.includes(term));
}

/**
 * The task a search found a challenge by, when its name alone wouldn't have
 * — shown under the row, so a result for "walk" called "Fresh Start" says
 * why it's there.
 */
export function matchedTask(card: ChallengeCard, query: string): string | undefined {
  const words = terms(query);
  if (words.length === 0) return undefined;
  const title = card.title.toLowerCase();
  if (words.every((term) => title.includes(term))) return undefined;
  return card.tasks.find((task) => words.some((term) => task.toLowerCase().includes(term)));
}
