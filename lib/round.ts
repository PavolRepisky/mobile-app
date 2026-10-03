/**
 * Where a challenge round stands today. Every round has one Day 1 that
 * everyone in it shares, so this is the same for whoever is looking — the
 * Challenges list and a challenge's own preview both read it from here.
 */

export const DAY_MS = 86_400_000;

/**
 * An ISO day read as local midnight. `new Date('2026-10-01')` is midnight in
 * UTC, which west of Greenwich is still the evening before — and a start date
 * a day early says the round has begun when it hasn't.
 */
export function localDay(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Midnight this morning, local time. */
export function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export type RoundState =
  | { kind: 'upcoming'; daysUntil: number }
  | { kind: 'running'; day: number }
  | { kind: 'ended' };

export function roundState(start: Date, totalDays: number): RoundState {
  const offset = Math.round((startOfToday().getTime() - start.getTime()) / DAY_MS);
  if (offset < 0) return { kind: 'upcoming', daysUntil: -offset };
  if (offset >= totalDays) return { kind: 'ended' };
  return { kind: 'running', day: offset + 1 };
}
