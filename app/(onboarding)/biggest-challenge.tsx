import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';

import { PrimaryButton } from '@/components/Buttons';
import { Headline } from '@/components/Headline';
import { OnboardingTopBar } from '@/components/OnboardingTopBar';
import { QuizGrid } from '@/components/QuizGrid';
import { ScreenScroll } from '@/components/Screen';
import { spacing } from '@/constants/theme';
import { BIGGEST_CHALLENGES } from '@/data/content';
import { useApp } from '@/hooks/useAppState';
import { stepProgress } from '@/lib/onboarding';

export default function BiggestChallengeScreen() {
  const router = useRouter();
  const { answers, answer } = useApp();

  return (
    <ScreenScroll tone="onboarding" bottomExtra={spacing['3xl']}>
      <OnboardingTopBar progress={stepProgress('biggest-challenge')} />

      <Headline size="hero" weight={700} accent="bold">{"What's your biggest\n*challenge* right now?"}</Headline>

      <QuizGrid
        options={BIGGEST_CHALLENGES}
        value={answers.biggestChallenge}
        onChange={(key) => answer('biggestChallenge', key)}
        style={styles.grid}
      />

      <PrimaryButton
        label="Continue"
        disabled={!answers.biggestChallenge}
        onPress={() => router.push('/(onboarding)/finding')}
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
