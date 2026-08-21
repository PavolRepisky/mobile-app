import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/Buttons';
import { Headline } from '@/components/Headline';
import { IconButton } from '@/components/IconButton';
import { ScreenScroll } from '@/components/Screen';
import { StickerCard } from '@/components/StickerCard';
import { spacing } from '@/constants/theme';
import { useApp } from '@/hooks/useAppState';
import { shortDate } from '@/lib/format';

export default function CongratsScreen() {
  const router = useRouter();
  const { challenge, tasks, startDate, endDate } = useApp();

  return (
    <ScreenScroll tone="onboarding" bottomExtra={spacing.xl}>
      <View style={styles.head}>
        <IconButton
          name="chevron-back"
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          background="transparent"
          shadow={false}
        />
      </View>

      <Headline size="hero" weight={700} style={styles.headline}>
        {"Congrats.\nYou're *ready* to **start**\nyour challenge"}
      </Headline>

      <StickerCard
        day={1}
        from={shortDate(startDate)}
        to={shortDate(endDate)}
        tasks={tasks.map((t) => t.label)}
        challengeName={challenge.stamp}
        style={styles.sticker}
      />

      <PrimaryButton
        label="Start now"
        onPress={() => router.push('/(onboarding)/paywall')}
        fullWidth={false}
        style={styles.cta}
      />
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  head: {
    minHeight: 56,
    justifyContent: 'center',
  },
  headline: {
    marginTop: spacing.sm,
  },
  sticker: {
    marginTop: spacing['3xl'],
    marginHorizontal: spacing['3xl'],
  },
  cta: {
    alignSelf: 'center',
    minWidth: 240,
    marginTop: spacing['4xl'],
  },
});
