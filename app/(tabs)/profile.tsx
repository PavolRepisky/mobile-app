import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';
import { MosaicArrangement } from '@/components/PhotoCollage';
import { PhotoLibrarySheet } from '@/components/PhotoLibrarySheet';
import { Placeholder } from '@/components/Placeholder';
import { ProfileStats } from '@/components/ProfileStats';
import { profileAvatarSize } from '@/components/ProfileLayout';
import { ScreenScroll } from '@/components/Screen';
import { Text } from '@/components/Text';
import { colors, radii, shadows, spacing } from '@/constants/theme';
import { FRIENDS } from '@/data/content';
import { useApp, usePostedDays } from '@/hooks/useAppState';

/** Kept out of the stylesheet because it is handed to `Image` as often as to
 * a `View`, and the two disagree about what a style is allowed to say —
 * the calendar's own day-cell mosaic does the same. */
const DAY_CELL_PIECE = { flex: 1 } as const;
/** No cut between a day's own photos — unlike the calendar's own mosaic,
 * the gap here belongs between whole day tiles, not the prints inside one. */
const DAY_CELL_SEAM = 0;
/** A hint of rounding on each post tile — smaller than the `sm` token, which
 * reads too soft against the tight edge-to-edge grid. */
const POST_TILE_RADIUS = 5;
/** Width over height for a post tile — a touch taller than square, rather
 * than the flat 1:1 an Instagram grid usually cuts its own tiles to. */
const POST_TILE_RATIO = 0.85;

/** Stable per key rather than random, so a tile's fake numbers don't reshuffle
 * on every render — the same trick `PhotoCollage`'s own pile hash uses. */
function fakeCount(key: string, min: number, max: number): number {
  let h = 0;
  for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) | 0;
  return min + (Math.abs(h) % (max - min + 1));
}

/** A bare glyph, sized on its own rather than the circular IconButton's. */
const settingsIconSize = 26;
/** The outline glyph has no bold cut of its own — stacking a second copy a
 * hair off the first thickens the stroke without switching to the filled
 * icon. */
const settingsBoldOffset = 0.6;

/** Same hero circle the to-do ring and a friend's profile share — this is
 * the one place on the app's own profile that gets to be that big. */
const avatarSize = profileAvatarSize;

/** The streak badge laps the ring's corner the way Instagram's own "+"
 * does — sized to that overlap, not to the type scale. */
const streakBadgeHeight = 30;
const streakBadgeOverlap = -4;
const streakBadgeRingWidth = 2;
const streakIconSize = 14;

/** Boxed rather than bare — each linked account gets its own small raised
 * chip, the way the reference groups them, instead of a row of loose glyphs. */
const socialIconSize = 16;
const socialIconBoxSize = 34;
const socialIconBoxBorderWidth = 1.5;

export default function ProfileScreen() {
  const router = useRouter();
  const {
    profile,
    currentDay,
    setAvatarPhoto,
    trophies,
    livesLeft,
    livesTotal,
    tasks,
    progress,
  } = useApp();

  // The circle goes straight to the library sheet — no source dialog in
  // between, since picking is the only thing the tap can mean.
  const [libraryOpen, setLibraryOpen] = useState(false);

  // Same order the day pager pages through — opening a tile and paging down
  // must land on the next tile in this exact sequence.
  const postedDays = usePostedDays();

  // A platform with no handle just drops out of the row instead of
  // rendering greyed-out — the row is a fact about the account, not a form.
  const socialLinks = [
    profile.socials.instagram
      ? {
          key: 'instagram',
          icon: 'logo-instagram' as const,
          url: `https://instagram.com/${profile.socials.instagram}`,
        }
      : null,
    profile.socials.tiktok
      ? {
          key: 'tiktok',
          icon: 'logo-tiktok' as const,
          url: `https://tiktok.com/@${profile.socials.tiktok}`,
        }
      : null,
    profile.socials.x
      ? {
          key: 'x',
          icon: 'logo-x' as const,
          url: `https://x.com/${profile.socials.x}`,
        }
      : null,
  ].filter((link): link is NonNullable<typeof link> => link !== null);

  // Every day with at least one real photo, most recent first — each one
  // cut into the same merged mosaic the to-do tab and a friend's own day
  // use, rather than a single cover shot standing in for the rest. Only
  // the tasks that actually got a photo take a slice of the cell: a day
  // with three of five shot reads as three prints, not three prints and
  // two grey gaps. A day with nothing real yet — today, most often — is
  // left out of the grid entirely rather than faked in with drawn
  // stand-ins.
  const posts = postedDays.map((day) => {
    const rows = tasks
      .map((task) => {
        const entry = progress[day]?.[task.id];
        return entry?.photo || entry?.photoSeed
          ? { key: task.id, photo: entry.photo ?? null, seed: entry.photoSeed ?? null }
          : null;
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    return {
      key: `day-${day}`,
      day,
      rows,
      likes: fakeCount(`day-${day}`, 40, 220),
      comments: fakeCount(`day-${day}-c`, 1, 12),
    };
  });

  return (
    <View style={styles.screenRoot}>
      {/* The Profile tab breaks from the warm app shell and sits on white,
          the way the reference screen does. */}
      <ScreenScroll tabBar tone="plain">
        {/* A slim header band of its own above the identity, the way a
            profile with a back/notifications row keeps those clear of the
            avatar rather than floating over it. A spacer matching the
            settings glyph's own width balances the row so the title centres
            on the page rather than on the space the icon leaves free. */}
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add friend"
            onPress={() => router.push('/add-friends')}
            hitSlop={spacing.md}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <View style={styles.headerIconStack}>
              <Ionicons name="person-add-outline" size={settingsIconSize} color={colors.ink} />
              <Ionicons
                name="person-add-outline"
                size={settingsIconSize}
                color={colors.ink}
                style={styles.headerIconOverlay}
              />
            </View>
          </Pressable>

          <Text variant="sectionTitle" center style={styles.headerTitle}>
            My Profile
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Settings"
            onPress={() => router.push('/account/settings')}
            hitSlop={spacing.md}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <View style={styles.headerIconStack}>
              <Ionicons name="settings-outline" size={settingsIconSize} color={colors.ink} />
              <Ionicons
                name="settings-outline"
                size={settingsIconSize}
                color={colors.ink}
                style={styles.headerIconOverlay}
              />
            </View>
          </Pressable>
        </View>

        <View style={styles.identity}>
          <View style={styles.headerRow}>
            <View>
              {/* A plain circle rather than the Instagram-style gradient
                  ring — the disc behind it is the avatar's own shape, so
                  the shadow still has something solid to cast from. */}
              <View style={[styles.avatarShadow, shadows.hard]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    profile.avatar || profile.avatarSeed
                      ? 'Change profile photo'
                      : 'Add profile photo'
                  }
                  onPress={() => setLibraryOpen(true)}
                  style={({ pressed }) => pressed && styles.pressed}
                >
                  <Avatar
                    source={profile.avatar ?? profile.avatarSeed}
                    size={avatarSize}
                  />
                </Pressable>
              </View>

              {/* The day-streak badge, lapping the avatar's own corner the
                  way Instagram's story "+" does. */}
              <View style={[styles.streakBadge, shadows.hard]}>
                <Ionicons name="calendar" size={streakIconSize} color={colors.inkInverse} />
                <Text variant="micro" color={colors.inkInverse}>
                  {currentDay}
                </Text>
              </View>
            </View>

            {/* Vertically centred next to the photo (the row's own
                alignItems does that), but the lines inside stay left-set —
                a name reads as a name, not a caption under a poster. */}
            <View style={styles.identityText}>
              <Text variant="sectionTitle">{profile.name}</Text>
              <Text variant="bodyBold" color={colors.inkMuted}>
                {profile.handle}
              </Text>

              {/* Read-only here: editing the bio is Settings' job now, not a
                  tap on the profile page itself. */}
              <Text
                variant="bodyBold"
                color={colors.inkMuted}
                style={styles.bio}
              >
                {profile.bio ?? 'No bio yet'}
              </Text>

              {/* Linked accounts, under the bio rather than under the photo
                  — a fact about the account, so it sits with the rest of
                  the account's facts. */}
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
                      <Ionicons
                        name={link.icon}
                        size={socialIconSize}
                        color={colors.inkMuted}
                      />
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          </View>

          {/* Part of the identity block: what the account has to show for
              itself belongs with the name, above the page's sections. No
              colour-per-icon either — every glyph here reads as ink, the same
              weight as the numeral it sits over. */}
          <ProfileStats
            stats={[
              {
                key: 'friends',
                icon: 'people',
                value: FRIENDS.length,
                label: 'Friends',
              },
              {
                key: 'trophies',
                icon: 'trophy',
                value: trophies,
                label: 'Completed',
              },
              {
                key: 'lives',
                icon: 'heart',
                value: `${livesLeft}/${livesTotal}`,
                label: 'Misses left',
                info: "Miss a day's tasks and it costs one of these. Run out, and your challenge restarts from day 1.",
              },
            ]}
            showIcons={false}
            style={styles.stats}
          />
        </View>

        {/* No card — the divider and the grid sit straight on the page,
            the way the reference does. */}
        <View style={styles.gridSection}>
          <View style={styles.divider} />

          {/* Every day so far, cut into the same merged mosaic the to-do
              tab and a friend's own day use — a day here reads exactly as
              it does everywhere else in the app. Likes and comments sit on
              the photo itself, washed in behind them the way the calendar's
              own day cell prints a label straight onto a photo. */}
          {posts.length === 0 ? (
            <EmptyState
              icon="camera-outline"
              title="No posts yet"
              hint="Photograph a task to see your first day here."
            />
          ) : (
            <View style={styles.postGrid}>
              {posts.map((post) => (
                <View key={post.key} style={styles.postCellWrap}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Day ${post.day}, ${post.likes} likes, ${post.comments} comments`}
                    onPress={() =>
                      router.push({ pathname: '/day/[day]', params: { day: String(post.day) } })
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

      <PhotoLibrarySheet
        visible={libraryOpen}
        onPick={setAvatarPhoto}
        onDismiss={() => setLibraryOpen(false)}
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
    width: settingsIconSize + settingsBoldOffset,
    height: settingsIconSize + settingsBoldOffset,
  },
  headerIconOverlay: {
    position: 'absolute',
    left: settingsBoldOffset,
    top: settingsBoldOffset,
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
    // A ring the page's own white so the badge reads as sitting on top of the
    // avatar rather than merging into its edge.
    borderWidth: streakBadgeRingWidth,
    borderColor: colors.backgroundPlain,
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
  // The name block fills what the row leaves past the ring.
  identityText: {
    flex: 1,
    marginLeft: spacing.xl,
  },
  bio: {
    marginTop: 2,
  },
  // Runs the full page width so the two hairlines land on the thirds, and sits
  // closer to the bio above than to the first section heading below: it
  // belongs to the name, not to the page.
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
  // Edge to edge — the reference's own photo grid runs the full page width,
  // no gutter either side — the gap lives between tiles (on `postCellWrap`
  // below), not inside one.
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
  // Both counts grouped on the left rather than split to the tile's two
  // edges — a caption reads as one line, not a row with a gap torn in it.
  // Capped to a fraction of the tile's own width instead of just inset from
  // the right: an inset alone still lets the row's content decide its own
  // width, and a native build's own cut of the bold face can measure wider
  // per digit than the web preview does — this caps the row itself, with
  // its own clip, so no digit can ever reach the tile's true edge.
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
  // A hard ceiling on the numeral itself — three digits is the most this
  // count is ever seeded with, so this is generous rather than tight.
  postMetaCount: {
    maxWidth: 32,
  },
});
