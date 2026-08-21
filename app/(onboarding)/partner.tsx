import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/Buttons';
import { Headline } from '@/components/Headline';
import { OnboardingTopBar } from '@/components/OnboardingTopBar';
import { Placeholder } from '@/components/Placeholder';
import { colors, radii, screenPadding, spacing } from '@/constants/theme';
import { stepProgress } from '@/lib/onboarding';

/** The social-proof screen: a big statistic, then a single wide CTA. */
export default function PartnerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.head}>
        <OnboardingTopBar progress={stepProgress('partner')} />

        <Headline size="hero" style={styles.stat}>
          {'*87%*'}
        </Headline>
        <Headline size="headline" weight={700}>
          {'of *women* who\n*finished* had someone\ndoing it *with* them'}
        </Headline>
      </View>

      <Placeholder seed="partner-art" radius={radii.card} style={styles.art} />

      <View
        style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}
      >
        <PrimaryButton
          label="Find my partner"
          onPress={() => router.push('/(onboarding)/invite')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.backgroundOnboarding,
  },
  head: {
    paddingHorizontal: screenPadding,
  },
  stat: {
    fontSize: 76,
    lineHeight: 84,
    marginBottom: spacing.sm,
  },
  art: {
    flex: 1,
    marginTop: spacing.xl,
  },
  footer: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.lg,
  },
});
