import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text as RNText,
  View,
} from 'react-native';

import { GlassSurface } from '@/components/GlassSurface';
import { IconButton } from '@/components/IconButton';
import {
  absoluteFill,
  colors,
  glass,
  radii,
  screenPadding,
  shadows,
  spacing,
} from '@/constants/theme';
import { FEED_POSTS, REACTIONS } from '@/data/content';
import { useApp } from '@/hooks/useAppState';

/**
 * Android had no cheap backdrop blur before API 31; below that the BlurView
 * renders as a hole, so those devices get a flat wash instead.
 */
const CAN_BLUR = Platform.OS !== 'android' || Number(Platform.Version) >= 31;

/**
 * Single post blown up over the feed it came from. The feed stays visible
 * behind, blurred — the photo reads as something lifted off the screen rather
 * than a screen of its own.
 */
export default function PostViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  // The reaction belongs to the post, not to this screen: it has to still be
  // on the tile once the viewer closes.
  const { postReactions, reactToPost } = useApp();

  const post = FEED_POSTS.find((p) => p.id === String(id)) ?? FEED_POSTS[0];
  const picked = postReactions[post.id] ?? null;

  return (
    <View style={styles.root}>
      {/* Tapping the blur closes, the way the invite panel's backdrop does. */}
      <Pressable
        accessibilityLabel="Dismiss"
        onPress={() => router.back()}
        style={absoluteFill}
      >
        {CAN_BLUR ? (
          <BlurView
            intensity={glass.blur}
            tint="light"
            experimentalBlurMethod={
              Platform.OS === 'android' ? 'dimezisBlurView' : undefined
            }
            style={absoluteFill}
          />
        ) : (
          <View style={[absoluteFill, styles.blurFallback]} />
        )}
        <View style={[absoluteFill, styles.wash]} />
      </Pressable>

      <IconButton
        name="close"
        onPress={() => router.back()}
        accessibilityLabel="Close"
        style={styles.close}
      />

      {/* The shadow is cast by the outer view and the image clipped by the
          inner one: on iOS a view cannot both clip its children and cast. */}
      <View style={styles.photo}>
        <View style={styles.photoClip}>
          <Image
            source={post.photo}
            contentFit="cover"
            transition={200}
            style={StyleSheet.absoluteFill}
          />
        </View>
      </View>

      <View style={styles.reactions}>
        {REACTIONS.map((emoji) => (
          <Pressable
            key={emoji}
            accessibilityRole="button"
            accessibilityLabel={`React ${emoji}`}
            accessibilityState={{ selected: picked === emoji }}
            onPress={() => reactToPost(post.id, emoji)}
            style={({ pressed }) => pressed && styles.pressed}
          >
            {/* The same lens as the recipe times, rather than a white disc. */}
            <GlassSurface radius={28}>
              <View
                style={[
                  styles.reaction,
                  picked === emoji && styles.reactionPicked,
                ]}
              >
                <RNText style={styles.emoji}>{emoji}</RNText>
              </View>
            </GlassSurface>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: screenPadding,
  },
  blurFallback: {
    backgroundColor: glass.fallback,
  },
  /** Lifts the blurred feed towards the app's own ground so the photo reads. */
  wash: {
    backgroundColor: colors.scrimLight,
  },
  close: {
    position: 'absolute',
    top: 56,
    right: screenPadding,
  },
  photo: {
    width: '78%',
    aspectRatio: 0.7,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    ...shadows.floating,
  },
  photoClip: {
    flex: 1,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  reactions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing['3xl'],
  },
  reaction: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
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
