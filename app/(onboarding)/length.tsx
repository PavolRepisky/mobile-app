import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { PrimaryButton } from '@/components/Buttons';
import { DateRange } from '@/components/DateRange';
import { Headline } from '@/components/Headline';
import { OnboardingTopBar } from '@/components/OnboardingTopBar';
import { Placeholder } from '@/components/Placeholder';
import { RulerSlider } from '@/components/RulerSlider';
import { Screen } from '@/components/Screen';
import { radii, spacing } from '@/constants/theme';
import { useApp } from '@/hooks/useAppState';
import { addDays, longDate } from '@/lib/format';
import { stepProgress } from '@/lib/onboarding';

/** 7 to 120 days, in single-day steps. */
const MIN_DAYS = 7;
const MAX_DAYS = 120;
const OPTIONS = MAX_DAYS - MIN_DAYS + 1;

export default function LengthScreen() {
  const router = useRouter();
  const { startDate, totalDays, setTotalDays } = useApp();
  const [index, setIndex] = useState(
    Math.min(Math.max(totalDays - MIN_DAYS, 0), OPTIONS - 1),
  );

  const days = MIN_DAYS + index;
  const end = addDays(startDate, days - 1);

  return (
    <Screen tone="onboarding">
      <OnboardingTopBar progress={stepProgress('length')} />

      <Headline size="hero">{'Set challenge\nlength?'}</Headline>

      <RulerSlider
        length={OPTIONS}
        index={index}
        onChange={setIndex}
        readout={`${days} days`}
        caption={<DateRange from={longDate(startDate)} to={longDate(end)} />}
        style={styles.ruler}
      />

      <Placeholder seed="length-art" radius={radii.card} style={styles.art} />

      <PrimaryButton
        label="Continue"
        onPress={() => {
          setTotalDays(days);
          router.push('/(onboarding)/rate');
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
