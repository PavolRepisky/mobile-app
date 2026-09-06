import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';

import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';
import { Headline } from '@/components/Headline';
import { IconButton } from '@/components/IconButton';
import { PhotoCollage } from '@/components/PhotoCollage';
import { PhotoLibrarySheet } from '@/components/PhotoLibrarySheet';
import { PhotoSlot } from '@/components/PhotoSlot';
import { PhotoStrip } from '@/components/PhotoStrip';
import { ProfileStats } from '@/components/ProfileStats';
import { ringInnerSize } from '@/components/DayRing';
import {
  profileActionHeight,
  profileActionTop,
  profileAvatarSize,
} from '@/components/ProfileLayout';
import { ScreenScroll } from '@/components/Screen';
import { Text } from '@/components/Text';
import {
  colors,
  fonts,
  screenPadding,
  shadows,
  spacing,
} from '@/constants/theme';
import { challengePhotos, FRIENDS } from '@/data/content';
import { useApp } from '@/hooks/useAppState';

/** No ring here, so the circle is the To-do ring's inner disc, not its outer. */
const avatarSize = ringInnerSize(profileAvatarSize);

/**
 * The pin grid: three across the page. Square, not the portrait wall-tile
 * shape hand-picked pins used to keep — a saved post is a day's mosaic, the
 * same square cut the calendar's day cells and a friend's card use, and a
 * hand-picked pin sits happily cropped into the same square beside them.
 */
const pinColumns = 3;
const pinAspect = 1;
const pinGap = spacing.md;

export default function ProfileScreen() {
  const router = useRouter();
  const {
    profile,
    challenge,
    currentDay,
    totalDays,
    setAvatarPhoto,
    wall,
    trophies,
    livesLeft,
  } = useApp();

  // Every pin from every collection, in the order the collections are held.
  // The grouping still exists in state — a friend's wall reads it — it just
  // has nothing to say on your own page. The only way in now is saving a
  // friend's post, so there is nothing here to seed the grid by hand.
  const pins = wall.flatMap((board) => board.pins);

  const { width: windowWidth } = useWindowDimensions();
  const pinWidth = Math.floor(
    (windowWidth - screenPadding * 2 - pinGap * (pinColumns - 1)) / pinColumns,
  );
  const pinHeight = Math.round(pinWidth / pinAspect);

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
        {/* The buttons themselves float above the scroll view, on the same
            line as the To-do pencil; this only holds their space. */}
        <View style={styles.topBarSpacer} />

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
          {/* The same ghost grey the inactive segmented tab uses. */}
          <Text variant="bodyBold" color={colors.inkGhost}>
            {profile.handle}
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/account/bio')}
            style={styles.bioRow}
          >
            <Text variant="bodyBold" color={colors.inkMuted}>
              {profile.bio ?? 'Add a bio'}
            </Text>
            <Ionicons
              name="pencil"
              size={15}
              color={colors.inkMuted}
              style={styles.bioPencil}
            />
          </Pressable>

          {/* Part of the identity block: what the account has to show for
              itself belongs with the name, above the page's sections. */}
          <ProfileStats
            stats={[
              {
                key: 'friends',
                icon: 'people',
                iconColor: colors.sky,
                value: FRIENDS.length,
                label: 'Friends',
                onPress: () => router.push('/friends'),
              },
              {
                key: 'trophies',
                icon: 'trophy',
                iconColor: colors.gold,
                value: trophies,
                label: 'Trophies',
                onPress: () => router.push('/trophies'),
              },
              {
                key: 'lives',
                icon: 'heart',
                iconColor: colors.destructive,
                value: livesLeft,
                label: livesLeft === 1 ? 'Life' : 'Lives',
              },
            ]}
            style={styles.stats}
          />
        </View>

        {/* The challenge's own name carries the section — the same weight a
            Discover row gives its title — with the day count under it in the
            same words the To-do home uses for it, so the two never disagree. */}
        <Headline size="headlineSm" align="left" style={styles.challengeTitle}>
          {challenge.name}
        </Headline>
        <Text variant="bodyBold" color={colors.inkMuted} style={styles.challengeDay}>
          Day {currentDay} of {totalDays}
        </Text>

        {/* The same four tiles, at the same size, as the challenge's row on
            Discover — one challenge, one picture of it. No badge on top: the
            title above already says you're in it. */}
        <PhotoStrip
          photos={challengePhotos(challenge.id) ?? challenge.photoSeeds}
          height={167}
          style={styles.joinedStrip}
        />

        <Text variant="sectionTitle" style={styles.pinsTitle}>
          Pins
        </Text>

        {pins.length === 0 ? (
          <EmptyState
            icon="bookmark-outline"
            title="No pins yet"
            hint="Save a friend's post to pin it here."
          />
        ) : (
          <View style={styles.pinGrid}>
            {pins.map((pin) =>
              pin.cells ? (
                <Pressable
                  key={pin.id}
                  accessibilityRole="button"
                  accessibilityLabel={pin.title}
                  onPress={() =>
                    router.push({
                      pathname: '/wall/[id]',
                      params: { id: pin.id },
                    })
                  }
                  style={({ pressed }) => [
                    { width: pinWidth, height: pinHeight },
                    pressed && styles.pressed,
                  ]}
                >
                  <PhotoCollage layout="mosaic" cells={pin.cells} />
                </Pressable>
              ) : (
                <PhotoSlot
                  key={pin.id}
                  photo={pin.photo}
                  seed={pin.id}
                  width={pinWidth}
                  height={pinHeight}
                  shadow={false}
                  onPress={() =>
                    router.push({
                      pathname: '/wall/[id]',
                      params: { id: pin.id },
                    })
                  }
                />
              ),
            )}
          </View>
        )}
      </ScreenScroll>

      <View style={styles.topBar}>
        <View style={styles.spacer} />
        {/* The To-do pencil's button exactly: the default glass lens at the
            default size, glyph set to 21. The two sit on the same line as
            each other across the two screens, so they should not be two
            different kinds of button. */}
        <IconButton
          name="settings-outline"
          iconSize={21}
          onPress={() => router.push('/account/settings')}
          accessibilityLabel="Settings"
        />
      </View>

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
  topBarSpacer: {
    height: 56,
  },
  // Pinned to the same line as the To-do home's corner button, measured from
  // the screen edge rather than from the scroll content.
  topBar: {
    position: 'absolute',
    top: profileActionTop,
    left: screenPadding,
    right: screenPadding,
    height: profileActionHeight,
    flexDirection: 'row',
    alignItems: 'center',
  },
  spacer: {
    flex: 1,
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
  bioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  bioPencil: {
    marginLeft: spacing.sm,
  },
  // Runs the full page width so the two hairlines land on the thirds, and sits
  // closer to the bio above than to the first section heading below: it
  // belongs to the name, not to the page.
  stats: {
    alignSelf: 'stretch',
    marginTop: spacing.xl,
  },
  challengeTitle: {
    marginTop: spacing['3xl'],
  },
  challengeDay: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  pinsTitle: {
    marginTop: spacing['3xl'],
    marginBottom: spacing.lg,
  },
  // The tile widths are worked out from this same gap, so three land on a row
  // with the page's own margins either side and nothing left over.
  pinGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: pinGap,
  },
  // The strip runs wider than the page gutter on either side, as it does on
  // Discover.
  joinedStrip: {
    marginHorizontal: -spacing.sm,
  },
});
