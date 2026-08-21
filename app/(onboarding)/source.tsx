import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/Buttons';
import { RadioRow } from '@/components/Choice';
import { Headline } from '@/components/Headline';
import { OnboardingTopBar } from '@/components/OnboardingTopBar';
import { Placeholder } from '@/components/Placeholder';
import { ScreenScroll } from '@/components/Screen';
import { radii, spacing } from '@/constants/theme';
import { REFERRAL_SOURCES } from '@/data/content';
import { useApp } from '@/hooks/useAppState';
import { stepProgress } from '@/lib/onboarding';

export default function SourceScreen() {
  const router = useRouter();
  const { answers, answer } = useApp();

  return (
    <ScreenScroll tone="onboarding" bottomExtra={spacing['3xl']}>
      <OnboardingTopBar progress={stepProgress('source')} />

      <Headline size="hero">{'How did *you* hear\nabout Her 75?'}</Headline>

      <View style={styles.list}>
        {REFERRAL_SOURCES.map((source) => (
          <RadioRow
            key={source}
            label={source}
            selected={answers.source === source}
            onPress={() => answer('source', source)}
          />
        ))}
      </View>

      {/* The reference bleeds a cut-out photo behind the lower half. */}
      <Placeholder seed="source-art" radius={radii.card} style={styles.art} />

      <PrimaryButton
        label="Continue"
        disabled={!answers.source}
        onPress={() => router.push('/(onboarding)/motivation')}
        fullWidth={false}
        style={styles.cta}
      />
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  list: {
    marginTop: spacing['4xl'],
    paddingHorizontal: spacing.sm,
  },
  art: {
    height: 190,
    marginTop: spacing['3xl'],
    marginHorizontal: -spacing.xl,
  },
  cta: {
    alignSelf: 'center',
    minWidth: 240,
    marginTop: spacing['3xl'],
  },
});
