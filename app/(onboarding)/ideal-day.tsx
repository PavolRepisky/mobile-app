import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';

import { PrimaryButton } from '@/components/Buttons';
import { Headline } from '@/components/Headline';
import { OnboardingTopBar } from '@/components/OnboardingTopBar';
import { QuizGrid } from '@/components/QuizGrid';
import { ScreenScroll } from '@/components/Screen';
import { spacing } from '@/constants/theme';
import { IDEAL_DAYS } from '@/data/content';
import { useApp } from '@/hooks/useAppState';
import { stepProgress } from '@/lib/onboarding';

export default function IdealDayScreen() {
  const router = useRouter();
  const { answers, answer } = useApp();

  return (
    <ScreenScroll tone="onboarding" bottomExtra={spacing['3xl']}>
      <OnboardingTopBar progress={stepProgress('ideal-day')} />

      <Headline size="hero" weight={700} accent="bold">{'What does your\n*ideal* day look like?'}</Headline>

      <QuizGrid
        options={IDEAL_DAYS}
        value={answers.idealDay}
        onChange={(key) => answer('idealDay', key)}
        style={styles.grid}
      />

      <PrimaryButton
        label="Continue"
        disabled={!answers.idealDay}
        onPress={() => router.push('/(onboarding)/biggest-challenge')}
        fullWidth={false}
        style={styles.cta}
      />
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  grid: {
    marginTop: spacing['3xl'],
  },
  cta: {
    alignSelf: 'center',
    minWidth: 240,
    marginTop: spacing['4xl'],
  },
});
