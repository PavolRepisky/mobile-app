import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { ringInnerSize } from '@/components/DayRing';
import { IconButton } from '@/components/IconButton';
import { PhotoStrip, type PhotoSource } from '@/components/PhotoStrip';
import { ProfileStats } from '@/components/ProfileStats';
import { profileActionTop, profileAvatarSize } from '@/components/ProfileLayout';
import { ScreenScroll, topPadding } from '@/components/Screen';
import { Text } from '@/components/Text';
import { colors, screenPadding, shadows, spacing } from '@/constants/theme';
import { PEOPLE, challengeStrip } from '@/data/content';
import { useApp } from '@/hooks/useAppState';

/** Matches the back button every other pushed screen uses. */
const BACK_SIZE = 46;

/** Same fixed total your own Profile screen reads off `useApp()` — every
 * challenge runs on the same three lives. */
const LIVES_TOTAL = 3;

/** No ring here, so the circle is your own Profile screen's inner disc, not
 * its outer — the two circles land at the same size. */
const avatarSize = ringInnerSize(profileAvatarSize);

/**
 * A friend's or a challenge member's profile, presented as a sheet from the
 * Community tab (and from a challenge's own page, when tapping who posted
 * it). Same shell as your own Profile screen — the title band, the circle,
 * the stats row, the current-challenge card — just without any of that
 * screen's edit affordances: no photo picker on the avatar, no settings gear,
 * a back button in its place.
 */
export default function FriendProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { challenge, totalDays } = useApp();

  const friend = PEOPLE.find((f) => f.id === String(id)) ?? PEOPLE[0];

  // The shared line the title and the back button both sit on — your own
  // Profile screen's own header exactly.
  const headerTop = Math.max(profileActionTop, topPadding(insets.top));
  const titleOffset = headerTop - topPadding(insets.top);

  // Their own shot proof photos where they have any; the challenge's own
  // strip otherwise, the same fallback your own Profile card uses.
  const friendPhotos = friend.tasks.reduce<PhotoSource[]>((acc, task) => {
    if (task.photo) acc.push(task.photo);
    else if (task.photoSeed) acc.push(task.photoSeed);
    return acc;
  }, []);
  const photos = friendPhotos.length > 0 ? friendPhotos : challengeStrip(challenge.id);

  return (
    // Absolute overlays need a positioned parent, otherwise their offsets
    // resolve against the scroll content instead of the screen.
    <View style={styles.screenRoot}>
      {/* Near-white, not the warm app shell — matches your own Profile tab. */}
      <ScreenScroll tone="plain">
        <View style={[styles.titleBand, { marginTop: titleOffset }]}>
          <Text variant="sectionTitle" center>
            Profile
          </Text>
        </View>

        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Avatar source={friend.avatar} size={avatarSize} />
          </View>

          <Text variant="sectionTitle" style={styles.name}>
            {friend.name}
          </Text>
          <Text variant="bodyBold" color={colors.inkMuted}>
            {friend.handle}
          </Text>
          <Text variant="bodyBold" color={colors.inkMuted} style={styles.bio}>
            {friend.bio ?? 'No bio yet'}
          </Text>

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
                label: 'Completed\nChallenges',
              },
              {
                key: 'lives',
                icon: 'heart',
                value: `${friend.livesLeft}/${LIVES_TOTAL}`,
                label: 'Lives',
              },
            ]}
            style={styles.stats}
          />
        </View>

        <Text variant="sectionTitle" style={styles.challengeSectionTitle}>
          Current challenge
        </Text>

        {/* Your own Profile screen's own card: same title-then-strip shape,
            badged with where they stand rather than your own day count. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${challenge.name}, day ${friend.day} of ${totalDays}`}
          onPress={() =>
            router.push({ pathname: '/feed/[id]', params: { id: challenge.id } })
          }
          style={styles.challengeCard}
        >
          <Text variant="sectionTitleXs" style={styles.challengeCardTitle}>
            {challenge.name}
          </Text>

          <PhotoStrip
            photos={photos}
            height={167}
            badge={`Day ${friend.day} of ${totalDays}`}
            badgePosition="bottom"
            badgeIcon="calendar"
            layout="flat"
            style={styles.joinedStrip}
          />
        </Pressable>
      </ScreenScroll>

      {/* Solid ink rather than the glass lens, so it reads as a control
          rather than another surface — every other pushed screen's own back
          button, top-left instead of the tab roots' top-right "+". */}
      <IconButton
        name="chevron-back"
        size={BACK_SIZE}
        iconSize={20}
        background={colors.ink}
        color={colors.inkInverse}
        shadow={false}
        onPress={() => router.back()}
        accessibilityLabel="Go back"
        style={[styles.back, { top: headerTop }, shadows.floating]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
  titleBand: {
    minHeight: BACK_SIZE,
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  back: {
    position: 'absolute',
    left: screenPadding,
  },
  identity: {
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  avatar: {
    width: avatarSize,
    height: avatarSize,
    borderRadius: avatarSize / 2,
    backgroundColor: colors.backgroundPlain,
    ...shadows.hard,
  },
  name: {
    marginTop: spacing.lg,
  },
  bio: {
    marginTop: 2,
  },
  // Runs the full page width so the two hairlines land on the thirds, and
  // sits closer to the bio above than to the first section heading below —
  // your own Profile screen's own spacing.
  stats: {
    alignSelf: 'stretch',
    marginTop: spacing.xl,
  },
  challengeSectionTitle: {
    marginTop: spacing['3xl'],
    marginBottom: spacing.lg,
  },
  // Bleeds to the page edge and back in, the same trick your own Profile
  // screen's card uses to give its Pressable a full-width hit target without
  // widening the photo strip past the page gutter.
  challengeCard: {
    marginHorizontal: -spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  challengeCardTitle: {
    marginBottom: spacing.xs,
  },
  // The strip runs wider than the page gutter on either side, as it does on
  // your own Profile screen.
  joinedStrip: {
    marginHorizontal: -spacing.sm,
  },
});
