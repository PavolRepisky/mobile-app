import { Ionicons } from '@expo/vector-icons';
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
  { key: 'active', label: 'Active' },
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

/** Leading glyph for a category wherever it's named. */
export const CATEGORY_ICONS: Record<ChallengeCategory, keyof typeof Ionicons.glyphMap> = {
  Fitness: 'barbell',
  Health: 'heart',
  Mindset: 'leaf',
  Lifestyle: 'sunny',
  Study: 'book',
};

/** One challenge as the browse screens show it — the one you're on and every
 * listed round in the same shape, so nothing marks yours out as a different
 * kind of thing. */
export interface ChallengeCard {
  id: string;
  title: string;
  photos: readonly PhotoSource[];
  category?: ChallengeCategory;
  tasksCount: number;
  /** Undefined for a custom challenge with no listing of its own — the
   * members count drops out rather than showing a number nothing backs. */
  members?: number;
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
      members: listing?.members,
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
          members: section.members,
          days: info.defaultDays,
          start,
          ...roundStatus(start, info.defaultDays),
        };
      },
    );

    return [mine, ...listed];
  }, [challenge, tasks.length, currentDay, totalDays]);
}

/** Each word of the query has to appear somewhere in the title, in any
 * order — "excuses no" still finds "No Excuses Challenge". */
export function matchesQuery(card: ChallengeCard, query: string): boolean {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const title = card.title.toLowerCase();
  return terms.every((term) => title.includes(term));
}
