import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';

import { PrimaryButton } from '@/components/Buttons';
import { Headline } from '@/components/Headline';
import { OnboardingTopBar } from '@/components/OnboardingTopBar';
import { QuizGrid } from '@/components/QuizGrid';
import { ScreenScroll } from '@/components/Screen';
import { spacing } from '@/constants/theme';
import { MOTIVATIONS } from '@/data/content';
import { useApp } from '@/hooks/useAppState';
import { stepProgress } from '@/lib/onboarding';

export default function MotivationScreen() {
  const router = useRouter();
  const { answers, answer } = useApp();

  return (
    <ScreenScroll tone="onboarding" bottomExtra={spacing['3xl']}>
      <OnboardingTopBar progress={stepProgress('motivation')} />

      <Headline size="hero" weight={700} accent="bold">{'Why do you\nwant to *complete* a\nchallenge?'}</Headline>

      <QuizGrid
        options={MOTIVATIONS}
        value={answers.motivation}
        onChange={(key) => answer('motivation', key)}
        style={styles.grid}
      />

      <PrimaryButton
        label="Continue"
        disabled={!answers.motivation}
        onPress={() => router.push('/(onboarding)/ideal-day')}
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
