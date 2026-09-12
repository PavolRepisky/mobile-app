import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { IconButton } from '@/components/IconButton';
import { PhotoLibrarySheet } from '@/components/PhotoLibrarySheet';
import { PhotoStrip } from '@/components/PhotoStrip';
import { ProfileStats } from '@/components/ProfileStats';
import { ringInnerSize } from '@/components/DayRing';
import { profileActionTop, profileAvatarSize } from '@/components/ProfileLayout';
import { ScreenScroll, topPadding } from '@/components/Screen';
import { Text } from '@/components/Text';
import { colors, fonts, screenPadding, shadows, spacing } from '@/constants/theme';
import { challengeStrip, FRIENDS } from '@/data/content';
import { useApp } from '@/hooks/useAppState';

/** Matches the settings corner button's own size. */
const ADD_SIZE = 46;

/** No ring here, so the circle is the To-do ring's inner disc, not its outer. */
const avatarSize = ringInnerSize(profileAvatarSize);

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    profile,
    challenge,
    currentDay,
    totalDays,
    setAvatarPhoto,
    trophies,
    livesLeft,
    livesTotal,
  } = useApp();

  /**
   * The shared line the title and the corner button both sit on: normally the
   * button's own fixed offset, but on a deep safe-area inset (Dynamic Island,
   * a tall notch) the scroll's own top padding can run past it — in which
   * case the button drops to meet the content instead of the title
   * disappearing under a fixed corner. Discover's own header exactly.
   */
  const headerTop = Math.max(profileActionTop, topPadding(insets.top));
  const titleOffset = headerTop - topPadding(insets.top);

  // The circle goes straight to the library sheet — no source dialog in
  // between, since picking is the only thing the tap can mean.
  const [libraryOpen, setLibraryOpen] = useState(false);

  return (
    // Absolute overlays need a positioned parent, otherwise their offsets
    // resolve against the scroll content instead of the screen.
    <View style={styles.screenRoot}>
      {/* The Profile tab breaks from the warm app shell and sits on white,
          the way the reference screen does. */}
      <ScreenScroll tabBar tone="plain">
        {/* A band the same height as the corner button, dropped to the
            button's own line — centring the text inside it is what lines the
            two up, rather than the two happening to agree. */}
        <View style={[styles.titleBand, { marginTop: titleOffset }]}>
          <Text variant="sectionTitle" center>
            Profile
          </Text>
        </View>

        <View style={styles.identity}>
          <View>
            {/* The To-do circle without its ring, so the photo itself comes
                out the size it does there. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                profile.avatar || profile.avatarSeed
                  ? 'Change profile photo'
                  : 'Add profile photo'
              }
              onPress={() => setLibraryOpen(true)}
              style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
            >
              <Avatar
                source={profile.avatar ?? profile.avatarSeed}
                size={avatarSize}
              />
            </Pressable>
            {!profile.avatar && !profile.avatarSeed ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setLibraryOpen(true)}
                style={styles.addPhoto}
              >
                <Text
                  variant="label"
                  color={colors.inkMuted}
                  center
                  style={styles.addPhotoText}
                >
                  Add{'\n'}photo
                </Text>
              </Pressable>
            ) : null}
          </View>

          <Text variant="sectionTitle" style={styles.name}>
            {profile.name}
          </Text>
          <Text variant="bodyBold" color={colors.inkMuted}>
            {profile.handle}
          </Text>

          {/* Read-only here: editing the bio is Settings' job now, not a tap
              on the profile page itself. */}
          <Text variant="bodyBold" color={colors.inkMuted} style={styles.bio}>
            {profile.bio ?? 'No bio yet'}
          </Text>

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
                label: 'Completed\nChallenges',
              },
              {
                key: 'lives',
                icon: 'heart',
                value: `${livesLeft}/${livesTotal}`,
                label: 'Lives',
              },
            ]}
            style={styles.stats}
          />
        </View>

        <Text variant="sectionTitle" style={styles.challengeSectionTitle}>
          Current challenge
        </Text>

        {/* Discover's own row, reused: same title, same flat strip — but
            where that row leads with a member count, this one leads with the
            one fact that actually matters here: where you stand in your own
            challenge. Set as the strip's own floating badge rather than a
            caption line, so the day you're on carries the same weight the
            photos do instead of reading as a footnote under the title. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${challenge.name}, day ${currentDay} of ${totalDays}`}
          onPress={() =>
            router.push({ pathname: '/feed/[id]', params: { id: challenge.id } })
          }
          style={styles.challengeCard}
        >
          <Text variant="sectionTitleXs" style={styles.challengeCardTitle}>
            {challenge.name}
          </Text>

          <PhotoStrip
            photos={challenge.photos ?? challengeStrip(challenge.id)}
            height={167}
            badge={`Day ${currentDay} of ${totalDays}`}
            badgePosition="bottom"
            badgeIcon="calendar"
            layout="flat"
            style={styles.joinedStrip}
          />
        </Pressable>
      </ScreenScroll>

      {/* Discover's own "+" button exactly: solid ink rather than the glass
          lens, so the one action that opens a whole new screen reads as a
          control rather than another surface floating over the page. */}
      <IconButton
        name="settings-outline"
        size={ADD_SIZE}
        iconSize={20}
        background={colors.ink}
        color={colors.inkInverse}
        shadow={false}
        onPress={() => router.push('/account/settings')}
        accessibilityLabel="Settings"
        style={[styles.corner, { top: headerTop }, shadows.floating]}
      />

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
  titleBand: {
    minHeight: ADD_SIZE,
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  corner: {
    position: 'absolute',
    right: screenPadding,
  },
  identity: {
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  pressed: {
    opacity: 0.85,
  },
  avatar: {
    width: avatarSize,
    height: avatarSize,
    borderRadius: avatarSize / 2,
    backgroundColor: colors.backgroundPlain,
    ...shadows.hard,
  },
  // No bold cut at label size in the scale, so the weight is set here.
  addPhotoText: {
    fontFamily: fonts.bodyBold,
  },
  addPhoto: {
    position: 'absolute',
    right: -24,
    top: -4,
    backgroundColor: colors.surface,
    borderRadius: 16,
    // The corner that tucks against the avatar is drawn tighter than the
    // three that sit free of it.
    borderBottomLeftRadius: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: 3,
    ...shadows.card,
  },
  name: {
    marginTop: spacing.lg,
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
  challengeSectionTitle: {
    marginTop: spacing['3xl'],
    marginBottom: spacing.lg,
  },
  // Bleeds to the page edge and back in, the same trick Discover's own row
  // uses to give its Pressable a full-width hit target without widening the
  // photo strip past the page gutter.
  challengeCard: {
    marginHorizontal: -spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  // Set close above the strip, matching Discover's own card title — the day
  // badge floats off the strip's bottom edge now, clear of the title.
  challengeCardTitle: {
    marginBottom: spacing.xs,
  },
  // The strip runs wider than the page gutter on either side, as it does on
  // Discover.
  joinedStrip: {
    marginHorizontal: -spacing.sm,
  },
});
