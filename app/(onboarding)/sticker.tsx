import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { PrimaryButton, TextLink } from '@/components/Buttons';
import { Headline } from '@/components/Headline';
import { AvatarPlaceholder, Placeholder } from '@/components/Placeholder';
import { Screen } from '@/components/Screen';
import { StickerCard } from '@/components/StickerCard';
import { Text } from '@/components/Text';
import { colors, radii, shadows, spacing } from '@/constants/theme';
import { useApp } from '@/hooks/useAppState';
import { shortDate } from '@/lib/format';

/**
 * "Make it official" — a mock story with the day-one sticker pasted on top,
 * previewing what gets shared.
 */
export default function OnboardingStickerScreen() {
  const router = useRouter();
  const { challenge, tasks, startDate, endDate } = useApp();
  const next = () => router.replace('/(onboarding)/personalizing');

  return (
    <Screen tone="onboarding">
      <View style={styles.storyWrap}>
        <Placeholder seed="story-mock" radius={radii.xl} style={styles.story}>
          <View style={styles.storyBars}>
            <View style={[styles.bar, styles.barActive]} />
            <View style={styles.bar} />
          </View>

          <View style={styles.storyHead}>
            <AvatarPlaceholder seed="story-me" size={30} />
            <Text variant="label" color={colors.inkInverse} style={styles.storyName}>
              you
            </Text>
            <View style={styles.spacer} />
            <Text variant="label" color={colors.inkInverse}>
              just now
            </Text>
          </View>

          <StickerCard
            day={1}
            from={shortDate(startDate)}
            to={shortDate(endDate)}
            tasks={tasks.map((t) => t.label)}
            challengeName={challenge.stamp}
            style={styles.sticker}
          />
        </Placeholder>
      </View>

      <Headline size="hero" style={styles.headline}>
        {'Make *it* official'}
      </Headline>

      <PrimaryButton
        label="Get my sticker"
        onPress={next}
        fullWidth={false}
        style={styles.cta}
      />

      <TextLink label="Skip" onPress={next} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  storyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  story: {
    width: '78%',
    aspectRatio: 0.52,
    padding: spacing.md,
    ...shadows.floating,
  },
  storyBars: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: spacing.md,
  },
  bar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  barActive: {
    backgroundColor: colors.inkInverse,
  },
  storyHead: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storyName: {
    marginLeft: spacing.sm,
  },
  spacer: {
    flex: 1,
  },
  sticker: {
    position: 'absolute',
    right: spacing.md,
    top: '18%',
    width: '68%',
    padding: spacing.lg,
  },
  headline: {
    marginBottom: spacing['2xl'],
  },
  cta: {
    alignSelf: 'center',
    minWidth: 250,
    marginBottom: spacing.sm,
  },
});
