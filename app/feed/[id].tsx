import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text as RNText, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { GlassSurface } from '@/components/GlassSurface';
import { IconButton } from '@/components/IconButton';
import { ScreenScroll } from '@/components/Screen';
import { Text } from '@/components/Text';
import {
  colors,
  fonts,
  radii,
  screenPadding,
  shadows,
  spacing,
} from '@/constants/theme';
import { DISCOVER, FEED_POSTS, PEOPLE } from '@/data/content';
import { useApp } from '@/hooks/useAppState';

/**
 * A challenge's post feed: a member count pill pinned to the top, then a
 * column of photo posts each with its author avatar, view count and time.
 */
export default function FeedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  // Reactions live in app state rather than on the post: leaving one in the
  // viewer has to show up here, on the tile it came from.
  const { postReactions } = useApp();

  const section = DISCOVER.find((s) => s.id === String(id)) ?? DISCOVER[0];

  return (
    // Absolute overlays need a positioned parent, otherwise their offsets
    // resolve against the scroll content instead of the screen.
    <View style={styles.screenRoot}>
      <ScreenScroll padded={false} bottomExtra={spacing['4xl']}>
        {/* Both are the lens rather than a white fill, and both are built here
            rather than from Pill: the lens sizes itself to its content, so the
            circle's dimensions have to live on the view inside it.

            The badge overlaps the circle, so it is drawn second — and lifted
            on Android, where paint order follows elevation, not the tree. */}
        <View style={styles.head}>
          <GlassSurface radius={37} style={styles.dayPill}>
            <View style={styles.dayPillInner}>
              <Text variant="bodyStrong">75</Text>
            </View>
          </GlassSurface>

          <GlassSurface radius={radii.pill} style={styles.members}>
            <View style={styles.membersInner}>
              <Text variant="button" style={styles.membersLabel}>
                {`${section.members.toLocaleString('en-US')} Members`}
              </Text>
            </View>
          </GlassSurface>
        </View>

        {FEED_POSTS.map((post) => {
          const author = PEOPLE.find((p) => p.id === post.authorId);

          return (
            <View key={post.id} style={styles.post}>
              {/* Their photo is the way into their profile, the same screen
                  the Friends tab opens. */}
              {author ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${author.name}'s profile`}
                  onPress={() =>
                    router.push({
                      pathname: '/friend/[id]',
                      params: { id: author.id },
                    })
                  }
                  style={({ pressed }) => [
                    styles.avatar,
                    pressed && styles.pressed,
                  ]}
                >
                  <Avatar source={author.avatar} size={44} />
                </Pressable>
              ) : null}

              <View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open post"
                  onPress={() =>
                    router.push({ pathname: '/post/[id]', params: { id: post.id } })
                  }
                >
                  <View style={styles.photo}>
                    <Image
                      source={post.photo}
                      contentFit="cover"
                      transition={200}
                      style={StyleSheet.absoluteFill}
                    />

                    <View style={styles.overlay}>
                      <View style={styles.views}>
                        <Ionicons
                          name="eye-outline"
                          size={19}
                          color={colors.inkInverse}
                        />
                        <Text
                          variant="label"
                          color={colors.inkInverse}
                          style={styles.viewsLabel}
                        >
                          {post.views}
                        </Text>
                      </View>

                      {postReactions[post.id] ? (
                        // The same lens the recipe times use, so the photo
                        // carries through the bubble instead of a white disc.
                        <GlassSurface radius={17} shadow={false}>
                          <View style={styles.reaction}>
                            <RNText style={styles.reactionEmoji}>
                              {postReactions[post.id]}
                            </RNText>
                          </View>
                        </GlassSurface>
                      ) : null}
                    </View>
                  </View>
                </Pressable>

                <Text variant="body" color={colors.inkMuted} style={styles.time}>
                  {post.time}
                </Text>
              </View>
            </View>
          );
        })}
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
    paddingTop: spacing.sm,
    paddingBottom: spacing['3xl'],
  },
  dayPill: {
    alignSelf: 'center',
    borderRadius: 37,
    ...shadows.deep,
  },
  dayPillInner: {
    width: 74,
    height: 74,
    alignItems: 'center',
    justifyContent: 'center',
  },
  members: {
    alignSelf: 'center',
    marginTop: -spacing.lg,
    zIndex: 1,
    ...shadows.deep,
    // Above the circle it overlaps, on both paint models — so it has to clear
    // that circle's own elevation, not just sit later in the tree.
    elevation: 22,
  },
  membersInner: {
    height: 48,
    paddingHorizontal: spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  membersLabel: {
    fontFamily: fonts.bodyBold,
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
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.divider,
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
    // Heavier and a size up from the label cut: it has to hold against
    // whatever the photo puts behind it.
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    lineHeight: 20,
  },
  reaction: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionEmoji: {
    fontSize: 17,
  },
  pressed: {
    opacity: 0.8,
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
