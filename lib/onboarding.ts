/**
 * The onboarding run, in order. Keeping it in one place means the progress
 * line and the "next" transitions stay in step when screens are added.
 */
export const ONBOARDING_STEPS = [
  'welcome',
  'value-todo',
  'value-friends',
  'value-thatgirl',
  'name',
  'source',
  'motivation',
  'ideal-day',
  'biggest-challenge',
  'finding',
  'select-challenge',
  'challenge-detail',
  'start-date',
  'length',
  'rate',
  'partner',
  'invite',
  'sticker',
  'personalizing',
  'congrats',
  'paywall',
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** 0–1 position of a step, used by the header progress line. */
export function stepProgress(step: OnboardingStep): number {
  const index = ONBOARDING_STEPS.indexOf(step);
  return (index + 1) / ONBOARDING_STEPS.length;
}

/** Route of the step after `step`, or null at the end of the run. */
export function nextStep(step: OnboardingStep): OnboardingStep | null {
  const index = ONBOARDING_STEPS.indexOf(step);
  return ONBOARDING_STEPS[index + 1] ?? null;
}

export function stepHref(step: OnboardingStep): `/(onboarding)/${OnboardingStep}` {
  return `/(onboarding)/${step}`;
}
