import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { PrimaryButton } from '@/components/Buttons';
import { Headline } from '@/components/Headline';
import { OnboardingTopBar } from '@/components/OnboardingTopBar';
import { Placeholder } from '@/components/Placeholder';
import { RulerSlider } from '@/components/RulerSlider';
import { Screen } from '@/components/Screen';
import { radii, spacing } from '@/constants/theme';
import { useApp } from '@/hooks/useAppState';
import { addDays, longDate } from '@/lib/format';
import { stepProgress } from '@/lib/onboarding';

/** How far ahead the start date can be pushed. */
const HORIZON = 60;

export default function StartDateScreen() {
  const router = useRouter();
  const { setStartDate } = useApp();
  const [offset, setOffset] = useState(0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const chosen = addDays(today, offset);

  return (
    <Screen tone="onboarding">
      <OnboardingTopBar progress={stepProgress('start-date')} />

      <Headline size="hero">{'When\ndo *you* start?'}</Headline>

      <RulerSlider
        length={HORIZON}
        index={offset}
        onChange={setOffset}
        readout={offset === 0 ? 'Today' : `In ${offset} day${offset > 1 ? 's' : ''}`}
        caption={longDate(chosen)}
        style={styles.ruler}
      />

      <Placeholder seed="start-date-art" radius={radii.card} style={styles.art} />

      <PrimaryButton
        label="Continue"
        onPress={() => {
          setStartDate(chosen);
          router.push('/(onboarding)/length');
        }}
        fullWidth={false}
        style={styles.cta}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  ruler: {
    marginTop: spacing['4xl'],
    marginHorizontal: -spacing.xl,
  },
  art: {
    flex: 1,
    marginTop: spacing['3xl'],
    marginHorizontal: -spacing.xl,
  },
  cta: {
    alignSelf: 'center',
    minWidth: 240,
    marginVertical: spacing['2xl'],
  },
});
