import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text as RNText, View } from 'react-native';

import { IconButton } from '@/components/IconButton';
import { Pill } from '@/components/Pill';
import { AvatarPlaceholder, Placeholder } from '@/components/Placeholder';
import { ScreenScroll } from '@/components/Screen';
import { Text } from '@/components/Text';
import { colors, radii, screenPadding, spacing } from '@/constants/theme';
import { DISCOVER, FEED_POSTS } from '@/data/content';

/**
 * A challenge's post feed: a member count pill pinned to the top, then a
 * column of photo posts each with its author avatar, view count and time.
 */
export default function FeedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const section = DISCOVER.find((s) => s.id === String(id)) ?? DISCOVER[0];

  return (
    // Absolute overlays need a positioned parent, otherwise their offsets
    // resolve against the scroll content instead of the screen.
    <View style={styles.screenRoot}>
      <ScreenScroll padded={false} bottomExtra={spacing['4xl']}>
        <View style={styles.head}>
          <Pill label="75" style={styles.dayPill} />
          <Pill
            label={`${section.members.toLocaleString('en-US')} Members`}
            size="lg"
            style={styles.members}
          />
        </View>

        {FEED_POSTS.map((post) => (
          <View key={post.id} style={styles.post}>
            <AvatarPlaceholder seed={post.authorSeed} size={44} style={styles.avatar} />

            <View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open post"
                onPress={() => router.push({ pathname: '/post/[id]', params: { id: post.id } })}
              >
                <Placeholder
                  seed={post.photoSeed}
                  radius={radii.lg}
                  style={styles.photo}
                >
                  <View style={styles.overlay}>
                    <View style={styles.views}>
                      <Ionicons name="eye" size={16} color={colors.inkInverse} />
                      <Text
                        variant="label"
                        color={colors.inkInverse}
                        style={styles.viewsLabel}
                      >
                        {post.views}
                      </Text>
                    </View>

                    {post.reaction ? (
                      <View style={styles.reaction}>
                        <RNText style={styles.reactionEmoji}>{post.reaction}</RNText>
                      </View>
                    ) : null}
                  </View>
                </Placeholder>
              </Pressable>

              <Text variant="body" color={colors.inkMuted} style={styles.time}>
                {post.time}
              </Text>
            </View>
          </View>
        ))}
      </ScreenScroll>

      <IconButton
        name="chevron-back"
        onPress={() => router.back()}
        accessibilityLabel="Go back"
        style={styles.back}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
  head: {
    alignItems: 'center',
    paddingTop: spacing['4xl'],
    paddingBottom: spacing['3xl'],
  },
  dayPill: {
    alignSelf: 'center',
    width: 74,
    height: 74,
    borderRadius: 37,
  },
  members: {
    alignSelf: 'center',
    marginTop: -spacing.lg,
  },
  post: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: screenPadding,
    marginBottom: spacing['3xl'],
  },
  avatar: {
    marginRight: spacing.md,
    marginBottom: spacing['3xl'],
  },
  photo: {
    width: 190,
    height: 250,
    justifyContent: 'flex-end',
  },
  overlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  views: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewsLabel: {
    marginLeft: spacing.xs,
  },
  reaction: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionEmoji: {
    fontSize: 17,
  },
  time: {
    marginTop: spacing.sm,
  },
  back: {
    position: 'absolute',
    top: 56,
    left: screenPadding,
  },
});
