import { useRouter } from 'expo-router';

import { ChallengePicker } from '@/components/ChallengePicker';
import { OnboardingTopBar } from '@/components/OnboardingTopBar';
import { ScreenScroll } from '@/components/Screen';
import { spacing } from '@/constants/theme';
import { useApp } from '@/hooks/useAppState';
import { stepProgress } from '@/lib/onboarding';

export default function SelectChallengeScreen() {
  const router = useRouter();
  const { selectChallenge } = useApp();

  return (
    <ScreenScroll tone="onboarding" bottomExtra={spacing['3xl']}>
      <OnboardingTopBar progress={stepProgress('select-challenge')} />

      <ChallengePicker
        onSelect={(id) => {
          selectChallenge(id);
          router.push('/(onboarding)/challenge-detail');
        }}
      />
    </ScreenScroll>
  );
}
