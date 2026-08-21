import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { PrimaryButton, SecondaryButton } from '@/components/Buttons';
import { Headline } from '@/components/Headline';
import { IconButton } from '@/components/IconButton';
import { InviteCard } from '@/components/InviteCard';
import { Pill } from '@/components/Pill';
import { Screen } from '@/components/Screen';
import { spacing } from '@/constants/theme';
import { useApp } from '@/hooks/useAppState';

export default function OnboardingInviteScreen() {
  const router = useRouter();
  const { profile, inviteCode } = useApp();
  const next = () => router.push('/(onboarding)/sticker');

  return (
    <Screen tone="onboarding">
      <View style={styles.head}>
        <IconButton
          name="close"
          onPress={next}
          accessibilityLabel="Skip"
          style={styles.close}
        />
      </View>

      <Headline size="hero" style={styles.headline}>
        {'Start the challenge\n*with* your friends?'}
      </Headline>

      <Pill
        label="+30% success with friends"
        tone="solid"
        size="lg"
        style={styles.badge}
      />

      <InviteCard
        name={profile.name}
        code={inviteCode}
        tilted
        style={styles.card}
      />

      <View style={styles.spacer} />

      <View style={styles.actions}>
        <SecondaryButton
          label="Start solo"
          onPress={next}
          fullWidth={false}
          style={styles.solo}
        />
        <PrimaryButton
          label="Send invites"
          icon="share-outline"
          onPress={next}
          fullWidth={false}
          style={styles.send}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: {
    minHeight: 56,
    justifyContent: 'center',
  },
  close: {
    position: 'absolute',
    right: 0,
  },
  headline: {
    marginTop: spacing['2xl'],
  },
  badge: {
    alignSelf: 'center',
    marginTop: spacing.xl,
  },
  card: {
    marginTop: spacing['4xl'],
  },
  spacer: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing['2xl'],
  },
  solo: {
    flex: 1,
  },
  send: {
    flex: 1.4,
  },
});
