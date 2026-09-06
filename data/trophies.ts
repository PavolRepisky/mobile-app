/**
 * A challenge the account has already finished. There is no event that
 * creates one of these yet — see `SEED_TROPHIES` in `useAppState` — so the
 * list here is simply seeded and left alone, the same way the trophy count
 * on the profile has always been.
 */
export interface Trophy {
  id: string;
  /** Into `CHALLENGES` — name, stamp and photos are read off it rather than
   * carried twice. */
  challengeId: string;
  startDate: string;
  finishDate: string;
  days: number;
}

export const TROPHIES: readonly Trophy[] = [
  {
    id: 't1',
    challengeId: 'her75',
    startDate: '2025-06-01',
    finishDate: '2025-08-15',
    days: 75,
  },
  {
    id: 't2',
    challengeId: 'hard',
    startDate: '2025-01-10',
    finishDate: '2025-03-26',
    days: 75,
  },
];
