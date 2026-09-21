import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';
import { MosaicArrangement } from '@/components/PhotoCollage';
import { Placeholder } from '@/components/Placeholder';
import { PhotoViewer } from '@/components/PhotoViewer';
import { ProfileStats } from '@/components/ProfileStats';
import { profileAvatarSize } from '@/components/ProfileLayout';
import { ScreenScroll } from '@/components/Screen';
import { Text } from '@/components/Text';
import { colors, radii, shadows, spacing } from '@/constants/theme';
import { PEOPLE } from '@/data/content';
import { useApp } from '@/hooks/useAppState';

/** Mirrors the own-profile grid's own cut — a friend's day reads as exactly
 * the same tile, so the two screens can share one glance. */
const DAY_CELL_PIECE = { flex: 1 } as const;
const DAY_CELL_SEAM = 0;
const POST_TILE_RADIUS = 5;
const POST_TILE_RATIO = 0.85;

/** Stable per key rather than random — same trick the own-profile grid and
 * `FriendCard` both use, so a tile's fake numbers don't reshuffle on render. */
function fakeCount(key: string, min: number, max: number): number {
  let h = 0;
  for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) | 0;
  return min + (Math.abs(h) % (max - min + 1));
}

/** A bare glyph, sized on its own rather than the circular IconButton's —
 * matches the own-profile header's corner glyphs exactly. */
const headerIconSize = 26;
/** The outline glyph has no bold cut of its own — stacking a second copy a
 * hair off the first thickens the stroke without switching to the filled
 * icon. */
const headerBoldOffset = 0.6;

/** Same hero circle the own-profile screen and the to-do ring share. */
const avatarSize = profileAvatarSize;

const streakBadgeHeight = 30;
const streakBadgeOverlap = -4;
const streakBadgeRingWidth = 2;
const streakIconSize = 14;

/** Boxed rather than bare — matches your own profile's own linked-account
 * chips exactly. */
const socialIconSize = 16;
const socialIconBoxSize = 34;
const socialIconBoxBorderWidth = 1.5;

/**
 * A friend's or a challenge member's profile, opened from the Community tab
 * or from who posted in a challenge feed. Same shell as your own Profile
 * screen — title band, circle with its streak badge, identity text, the
 * stats row, then their day cut into the same photo grid — just with a back
 * button standing in for the add-friend glyph and no settings gear, since
 * there is nothing here to edit.
 */
export default function FriendProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { challenge } = useApp();
  const [avatarOpen, setAvatarOpen] = useState(false);

  const friend = PEOPLE.find((f) => f.id === String(id)) ?? PEOPLE[0];

  // Same drop-out rule as your own profile's row — a platform with no handle
  // just isn't in it, rather than rendering greyed-out.
  const socialLinks = [
    friend.socials.instagram
      ? {
          key: 'instagram',
          icon: 'logo-instagram' as const,
          url: `https://instagram.com/${friend.socials.instagram}`,
        }
      : null,
    friend.socials.tiktok
      ? {
          key: 'tiktok',
          icon: 'logo-tiktok' as const,
          url: `https://tiktok.com/@${friend.socials.tiktok}`,
        }
      : null,
    friend.socials.x
      ? {
          key: 'x',
          icon: 'logo-x' as const,
          url: `https://x.com/${friend.socials.x}`,
        }
      : null,
  ].filter((link): link is NonNullable<typeof link> => link !== null);

  // Their current day plus every earlier one — most recent first, the same
  // order the own-profile grid lists its own days in. Each is cut into the
  // same merged mosaic that grid uses for a day with fewer than all its
  // tasks photographed.
  const days = [
    { day: friend.day, tasks: friend.tasks },
    ...(friend.pastPosts ?? []),
  ].sort((a, b) => b.day - a.day);

  const posts = days
    .map(({ day, tasks }) => {
      const rows = tasks
        .map((task) =>
          task.photo || task.photoSeed
            ? { key: task.label, photo: task.photo ?? null, seed: task.photoSeed ?? null }
            : null,
        )
        .filter((row): row is NonNullable<typeof row> => row !== null);

      return rows.length
        ? {
            key: `${friend.id}-day${day}`,
            day,
            rows,
            likes: fakeCount(`${friend.id}-day${day}`, 40, 220),
            comments: fakeCount(`${friend.id}-day${day}-c`, 1, 12),
          }
        : null;
    })
    .filter((post): post is NonNullable<typeof post> => post !== null);

  return (
    <View style={styles.screenRoot}>
      {/* Near-white, not the warm app shell — matches your own Profile tab. */}
      <ScreenScroll tone="plain">
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            hitSlop={spacing.md}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <View style={styles.headerIconStack}>
              <Ionicons name="chevron-back" size={headerIconSize} color={colors.ink} />
              <Ionicons
                name="chevron-back"
                size={headerIconSize}
                color={colors.ink}
                style={styles.headerIconOverlay}
              />
            </View>
          </Pressable>

          <Text variant="sectionTitle" center style={styles.headerTitle}>
            Profile
          </Text>

          {/* Matches the add-friend/settings glyph's own width, so the title
              still centres on the page rather than on the space a lone back
              button leaves free. */}
          <View style={styles.headerIconStack} />
        </View>

        <View style={styles.identity}>
          <View style={styles.headerRow}>
            <View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`View ${friend.name}'s profile photo`}
                disabled={!friend.avatar}
                onPress={() => setAvatarOpen(true)}
                style={({ pressed }) => [styles.avatarShadow, shadows.hard, pressed && styles.pressed]}
              >
                <Avatar source={friend.avatar} size={avatarSize} />
              </Pressable>

              {/* The day-streak badge, lapping the avatar's own corner —
                  their own day count, the way yours shows on your own
                  profile. */}
              <View style={[styles.streakBadge, shadows.hard]}>
                <Ionicons name="calendar" size={streakIconSize} color={colors.inkInverse} />
                <Text variant="micro" color={colors.inkInverse}>
                  {friend.day}
                </Text>
              </View>
            </View>

            <View style={styles.identityText}>
              <Text variant="sectionTitle">{friend.name}</Text>
              <Text variant="bodyBold" color={colors.inkMuted}>
                {friend.handle}
              </Text>
              <Text variant="bodyBold" color={colors.inkMuted} style={styles.bio}>
                {friend.bio ?? 'No bio yet'}
              </Text>

              {socialLinks.length ? (
                <View style={styles.socialsRow}>
                  {socialLinks.map((link) => (
                    <Pressable
                      key={link.key}
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${link.key}`}
                      onPress={() => Linking.openURL(link.url)}
                      style={({ pressed }) => [
                        styles.socialIconBox,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Ionicons name={link.icon} size={socialIconSize} color={colors.inkMuted} />
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          </View>

          <ProfileStats
            stats={[
              {
                key: 'friends',
                icon: 'people',
                value: friend.friendCount,
                label: 'Friends',
              },
              {
                key: 'trophies',
                icon: 'trophy',
                value: friend.trophies,
                label: 'Completed',
              },
              {
                key: 'lives',
                icon: 'heart',
                value: `${friend.livesLeft}/3`,
                label: 'Misses left',
                info: "Miss a day's tasks and it costs one of these. Run out, and the challenge restarts from day 1.",
              },
            ]}
            style={styles.stats}
          />
        </View>

        <View style={styles.gridSection}>
          <View style={styles.divider} />

          {posts.length === 0 ? (
            <EmptyState
              icon="camera-outline"
              title="No posts yet"
              hint={`${friend.name} hasn't photographed a task yet.`}
            />
          ) : (
            <View style={styles.postGrid}>
              {posts.map((post) => (
                <View key={post.key} style={styles.postCellWrap}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${challenge.name}, day ${post.day}, ${post.likes} likes, ${post.comments} comments`}
                    onPress={() =>
                      router.push({
                        pathname: '/friend/post/[id]',
                        params: { id: friend.id, day: String(post.day) },
                      })
                    }
                    style={({ pressed }) => [styles.postTile, pressed && styles.pressed]}
                  >
                    <MosaicArrangement
                      cells={post.rows}
                      seam={DAY_CELL_SEAM}
                      renderCell={(row) =>
                        row.photo ? (
                          <Image
                            key={row.key}
                            source={row.photo}
                            style={DAY_CELL_PIECE}
                            contentFit="cover"
                          />
                        ) : (
                          <Placeholder
                            key={row.key}
                            seed={row.seed ?? undefined}
                            radius={0}
                            style={DAY_CELL_PIECE}
                          />
                        )
                      }
                    />

                    <View style={styles.postMeta}>
                      <View style={styles.postMetaItem}>
                        <Ionicons name="heart-outline" size={14} color={colors.inkInverse} />
                        <Text
                          variant="microBold"
                          color={colors.inkInverse}
                          numberOfLines={1}
                          style={styles.postMetaCount}
                        >
                          {post.likes}
                        </Text>
                      </View>
                      <View style={styles.postMetaItem}>
                        <Ionicons name="chatbubble-outline" size={13} color={colors.inkInverse} />
                        <Text
                          variant="microBold"
                          color={colors.inkInverse}
                          numberOfLines={1}
                          style={styles.postMetaCount}
                        >
                          {post.comments}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScreenScroll>

      <PhotoViewer
        photos={friend.avatar ? [friend.avatar] : []}
        index={avatarOpen ? 0 : null}
        onDismiss={() => setAvatarOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  headerTitle: {
    flex: 1,
  },
  identity: {
    marginTop: spacing.xs,
  },
  headerIconStack: {
    width: headerIconSize + headerBoldOffset,
    height: headerIconSize + headerBoldOffset,
  },
  headerIconOverlay: {
    position: 'absolute',
    left: headerBoldOffset,
    top: headerBoldOffset,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  avatarShadow: {
    width: avatarSize,
    height: avatarSize,
    borderRadius: avatarSize / 2,
    backgroundColor: colors.backgroundPlain,
  },
  streakBadge: {
    position: 'absolute',
    bottom: streakBadgeOverlap,
    right: streakBadgeOverlap,
    height: streakBadgeHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
    borderWidth: streakBadgeRingWidth,
    borderColor: colors.backgroundPlain,
  },
  identityText: {
    flex: 1,
    marginLeft: spacing.xl,
  },
  bio: {
    marginTop: 2,
  },
  socialsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  socialIconBox: {
    width: socialIconBoxSize,
    height: socialIconBoxSize,
    borderRadius: radii.sm,
    borderWidth: socialIconBoxBorderWidth,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stats: {
    alignSelf: 'stretch',
    marginTop: spacing.xl,
  },
  gridSection: {
    marginTop: spacing.xl,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    marginBottom: spacing.lg,
  },
  postGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  postCellWrap: {
    width: '33.333%',
    padding: 1,
  },
  postTile: {
    aspectRatio: POST_TILE_RATIO,
    borderRadius: POST_TILE_RADIUS,
    overflow: 'hidden',
    backgroundColor: colors.surfaceSunken,
  },
  postMeta: {
    position: 'absolute',
    left: spacing.xs,
    bottom: spacing.xs,
    maxWidth: '70%',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  postMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    gap: 3,
  },
  postMetaCount: {
    maxWidth: 32,
  },
});
