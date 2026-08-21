import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/Buttons';
import { Headline } from '@/components/Headline';
import { Text } from '@/components/Text';
import { colors, radii, screenPadding, shadows, spacing } from '@/constants/theme';
import { useApp } from '@/hooks/useAppState';

/**
 * The invite panel raised by the `+` on the Friends tab. Presented as a
 * transparent modal so the tab behind stays visible and dimmed.
 */
export default function InviteScreen() {
  const router = useRouter();
  const { profile, inviteCode } = useApp();

  return (
    <View style={styles.root}>
      <Pressable
        accessibilityLabel="Dismiss"
        style={StyleSheet.absoluteFill}
        onPress={() => router.back()}
      />

      <View style={styles.panel}>
        <Headline size="hero" weight={700}>
          {`You're *invited*\nto join ${profile.name}'s\nchallenge`}
        </Headline>

        <Text variant="sectionTitle" center style={styles.code}>
          {inviteCode}
        </Text>
        <Text variant="bodyStrong" center>
          Use this code to join
        </Text>

        <PrimaryButton
          label="Send invites"
          icon="share-outline"
          onPress={() => router.back()}
          fullWidth={false}
          style={styles.send}
        />

        <Text variant="body" color={colors.inkMuted} center style={styles.or}>
          or
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.codeField, pressed && styles.pressed]}
        >
          <Text variant="button" color={colors.inkMuted}>
            Use a friend&apos;s code
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(248,245,240,0.72)',
    paddingHorizontal: screenPadding,
  },
  panel: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.sm,
    paddingVertical: spacing['4xl'],
    paddingHorizontal: spacing['2xl'],
    ...shadows.card,
  },
  code: {
    marginTop: spacing['3xl'],
    letterSpacing: 1,
  },
  send: {
    alignSelf: 'center',
    minWidth: 240,
    marginTop: spacing['2xl'],
  },
  or: {
    marginTop: spacing.lg,
  },
  codeField: {
    marginTop: spacing.md,
    height: 58,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
