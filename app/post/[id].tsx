import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text as RNText, View } from 'react-native';

import { IconButton } from '@/components/IconButton';
import { Placeholder } from '@/components/Placeholder';
import { colors, radii, screenPadding, shadows, spacing } from '@/constants/theme';
import { FEED_POSTS, REACTIONS } from '@/data/content';

/**
 * Single post blown up over a blurred wash of the feed, with the emoji
 * reaction row beneath it.
 */
export default function PostViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [picked, setPicked] = useState<string | null>(null);

  const post = FEED_POSTS.find((p) => p.id === String(id)) ?? FEED_POSTS[0];

  return (
    <View style={styles.root}>
      <IconButton
        name="close"
        onPress={() => router.back()}
        accessibilityLabel="Close"
        style={styles.close}
      />

      <Placeholder seed={post.photoSeed} radius={radii.lg} style={styles.photo} />

      <View style={styles.reactions}>
        {REACTIONS.map((emoji) => (
          <Pressable
            key={emoji}
            accessibilityRole="button"
            accessibilityLabel={`React ${emoji}`}
            onPress={() => setPicked(emoji)}
            style={({ pressed }) => [
              styles.reaction,
              picked === emoji && styles.reactionPicked,
              pressed && styles.pressed,
            ]}
          >
            <RNText style={styles.emoji}>{emoji}</RNText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: screenPadding,
  },
  close: {
    position: 'absolute',
    top: 56,
    right: screenPadding,
  },
  photo: {
    width: '78%',
    aspectRatio: 0.7,
    ...shadows.floating,
  },
  reactions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing['3xl'],
  },
  reaction: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  },
  reactionPicked: {
    backgroundColor: colors.divider,
  },
  emoji: {
    fontSize: 24,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.94 }],
  },
});
