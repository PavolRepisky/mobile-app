import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton, TextLink } from '@/components/Buttons';
import { Headline } from '@/components/Headline';
import { PhotoStrip } from '@/components/PhotoStrip';
import { Text } from '@/components/Text';
import { colors, screenPadding, spacing } from '@/constants/theme';
import { CHALLENGES } from '@/data/challenges';
import { joinedLabel } from '@/lib/format';

/**
 * The list of challenges runs off the top of the screen and fades into a white
 * wash carrying the headline and CTA — content sits behind the copy rather
 * than stopping above it.
 */
export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.list,
          { paddingTop: insets.top + spacing.xl },
        ]}
      >
        {CHALLENGES.map((challenge) => (
          <View key={challenge.id} style={styles.row}>
            <PhotoStrip
              seeds={challenge.photoSeeds}
              badge={joinedLabel(challenge.joined)}
              height={150}
              radius={0}
            />
            <Text variant="sectionTitle" style={styles.rowTitle}>
              {challenge.name}
            </Text>
          </View>
        ))}
      </ScrollView>

      <LinearGradient
        colors={[
          'rgba(253,253,253,0)',
          'rgba(253,253,253,0.85)',
          colors.backgroundOnboarding,
        ]}
        locations={[0, 0.35, 0.62]}
        style={[styles.wash, { paddingBottom: insets.bottom + spacing.xl }]}
        pointerEvents="box-none"
      >
        <Headline size="hero" style={styles.headline}>
          {'Choose\nyour *challenge*'}
        </Headline>

        <PrimaryButton
          label="Get Started"
          onPress={() => router.push('/(onboarding)/value-todo')}
          fullWidth={false}
          style={styles.cta}
        />

        <TextLink
          label="Already have an account?"
          onPress={() => router.replace('/(tabs)/todo')}
        />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.backgroundOnboarding,
  },
  list: {
    paddingHorizontal: 0,
    paddingBottom: 420,
  },
  row: {
    marginBottom: spacing['3xl'],
  },
  rowTitle: {
    marginTop: spacing.md,
    paddingHorizontal: screenPadding,
  },
  wash: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 120,
    paddingHorizontal: screenPadding,
    alignItems: 'center',
  },
  headline: {
    marginBottom: spacing['2xl'],
  },
  cta: {
    minWidth: 260,
    marginBottom: spacing.sm,
  },
});
