import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text as RNText, View } from 'react-native';

import { Card } from '@/components/Card';
import { Headline } from '@/components/Headline';
import { colors, radii, spacing } from '@/constants/theme';
import { useApp } from '@/hooks/useAppState';

/**
 * A single centred card asking for a thumbs up or down. Either answer moves on
 * — the reference has no skip and no Continue button.
 */
export default function RateScreen() {
  const router = useRouter();
  const { answer } = useApp();

  const respond = (liked: boolean) => {
    answer('likesApp', liked);
    router.push('/(onboarding)/partner');
  };

  return (
    <View style={styles.root}>
      <Card style={styles.card} padded={false}>
        <Headline size="hero" style={styles.headline}>
          {'Do *you* like\nthe app?'}
        </Headline>

        <View style={styles.buttons}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="No"
            onPress={() => respond(false)}
            style={({ pressed }) => [styles.emojiButton, pressed && styles.pressed]}
          >
            <RNText style={styles.emoji}>👎</RNText>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Yes"
            onPress={() => respond(true)}
            style={({ pressed }) => [styles.emojiButton, pressed && styles.pressed]}
          >
            <RNText style={styles.emoji}>👍</RNText>
          </Pressable>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.backgroundOnboarding,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  card: {
    alignSelf: 'stretch',
    paddingVertical: spacing['4xl'],
    paddingHorizontal: spacing['2xl'],
    alignItems: 'center',
  },
  headline: {
    marginBottom: spacing['2xl'],
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  emojiButton: {
    width: 92,
    height: 92,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 40,
  },
  pressed: {
    opacity: 0.7,
  },
});
