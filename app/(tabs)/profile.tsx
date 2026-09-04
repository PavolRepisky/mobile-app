import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { Headline } from '@/components/Headline';
import { IconButton } from '@/components/IconButton';
import { Pill, pillHeights } from '@/components/Pill';
import { PhotoLibrarySheet } from '@/components/PhotoLibrarySheet';
import { PhotoStrip } from '@/components/PhotoStrip';
import { ProfileStats } from '@/components/ProfileStats';
import { ringInnerSize } from '@/components/DayRing';
import {
  profileActionHeight,
  profileActionTop,
  profileAvatarSize,
} from '@/components/ProfileLayout';
import { ScreenScroll } from '@/components/Screen';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { Text } from '@/components/Text';
import { WallSection } from '@/components/WallSection';
import {
  colors,
  fonts,
  glass,
  radii,
  screenPadding,
  shadows,
  spacing,
} from '@/constants/theme';
import { challengePhotos, FRIENDS } from '@/data/content';
import { useApp } from '@/hooks/useAppState';

/** The four faces on the ambassador card, bundled so the row never waits. */
const ambassadorFaces = [
  require('@/assets/ambassadors/amb-1.jpg'),
  require('@/assets/ambassadors/amb-2.jpg'),
  require('@/assets/ambassadors/amb-3.jpg'),
  require('@/assets/ambassadors/amb-4.jpg'),
];

type Tab = 'profile' | 'wall';

/** No ring here, so the circle is the To-do ring's inner disc, not its outer. */
const avatarSize = ringInnerSize(profileAvatarSize);

/**
 * Outer height of the joined badge: the pill itself plus the glass rim it
 * carries on both edges. The badge straddles the strip's top edge, so half of
 * this hangs above the photos and half laps over them.
 */
const joinedBadgeHeight = pillHeights.md + glass.rimWidth * 2;

export default function ProfileScreen() {
  const router = useRouter();
  const {
    profile,
    challenge,
    setAvatarPhoto,
    wall,
    renameWallBoard,
    startPinDraft,
    trophies,
    livesLeft,
  } = useApp();
  const [tab, setTab] = useState<Tab>('profile');

  // The circle goes straight to the library sheet — no source dialog in
  // between, since picking is the only thing the tap can mean.
  const [libraryOpen, setLibraryOpen] = useState(false);

  /** The wall collection the library was opened for, or null for the circle. */
  const [pinningTo, setPinningTo] = useState<string | null>(null);
  /**
   * Held until the sheet has actually gone: pushing the Create Pin screen
   * while it is still on its way down is what drops it on iOS.
   */
  const pending = useRef<(() => void) | null>(null);
  const runPending = () => {
    const next = pending.current;
    pending.current = null;
    next?.();
  };

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

          {/* Part of the identity block rather than of the Profile tab, so the
              tally stays put when you switch over to the wall. */}
          <ProfileStats
            stats={[
              {
                key: 'friends',
                icon: 'people',
                value: FRIENDS.length,
                label: 'Friends',
                onPress: () => router.push('/friends'),
              },
              {
                key: 'trophies',
                icon: 'trophy',
                value: trophies,
                label: 'Trophies',
              },
              {
                key: 'lives',
                icon: 'heart',
                value: livesLeft,
                label: livesLeft === 1 ? 'Life' : 'Lives',
              },
            ]}
            style={styles.stats}
          />
        </View>

        <SegmentedTabs
          options={[
            { key: 'profile', label: 'Profile' },
            { key: 'wall', label: 'My Wall' },
          ]}
          value={tab}
          onChange={setTab}
          style={styles.tabs}
        />

        {tab === 'profile' ? (
          <>
            <View style={styles.joined}>
              {/* The same four tiles, at the same size, as the challenge's row
                  on Discover — one challenge, one picture of it. */}
              <PhotoStrip
                photos={challengePhotos(challenge.id) ?? challenge.photoSeeds}
                height={167}
                style={styles.joinedStrip}
              />
              <View pointerEvents="none" style={styles.joinedBadge}>
                <Pill
                  icon="checkmark"
                  tone="glass"
                  bold
                  label={`Joined ${challenge.name}`}
                  style={styles.joinedPill}
                />
              </View>
            </View>

            {/* The card clips its contents, and on iOS a view cannot both
                clip and cast — so the shadow lives out here. */}
            <View style={styles.promoShadow}>
              <Card onPress={() => {}} padded={false}>
                <View style={styles.promoRow}>
                  {/* A cut-out rather than a tile, so it stands on the card the
                      way the day's photos stand on the To-do list. */}
                  <Image
                    source={require('@/assets/support/newspaper.png')}
                    contentFit="contain"
                    transition={200}
                    style={styles.promoArt}
                  />
                  <View style={styles.promoBody}>
                    <Headline size="title" weight={500}>
                      {'Her 75\n*support*'}
                    </Headline>
                    <Text
                      variant="bodySemi"
                      color={colors.inkMuted}
                      center
                      style={styles.promoList}
                    >
                      {'• suggest a feature\n• report a bug\n• get help'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color={colors.ink} />
                </View>
              </Card>
            </View>

            <View style={styles.promoShadow}>
              <Card onPress={() => {}} padded={false}>
                <View style={styles.promoRow}>
                  <View style={styles.promoBody}>
                    <View style={styles.promoAvatars}>
                      {ambassadorFaces.map((face, i) => (
                        <Avatar
                          key={i}
                          source={face}
                          size={62}
                          style={[styles.avatarRing, i > 0 && styles.avatarOverlap]}
                        />
                      ))}
                    </View>
                    <Headline size="title" weight={500}>
                      {"We're hiring\nTikTok & Instagram\n*ambassadors*"}
                    </Headline>
                    <Text
                      variant="bodySemi"
                      color={colors.inkMuted}
                      center
                      style={styles.promoList}
                    >
                      Get paid to do your challenge
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color={colors.ink} />
                </View>
              </Card>
            </View>
          </>
        ) : (
          <View>
            {wall.map((board) => (
              <WallSection
                key={board.id}
                title={board.title}
                items={board.pins}
                editable
                onRename={(next) => renameWallBoard(board.id, next)}
                onAddPhoto={() => setPinningTo(board.id)}
                onPressItem={(item) =>
                  router.push({
                    pathname: '/wall/[id]',
                    params: { id: item.id },
                  })
                }
              />
            ))}
          </View>
        )}
      </ScreenScroll>

      <View style={styles.topBar}>
        <View style={styles.spacer} />
        <IconButton
          name="settings-outline"
          background="transparent"
          shadow={false}
          onPress={() => router.push('/account/settings')}
          accessibilityLabel="Settings"
        />
      </View>

      <PhotoLibrarySheet
        visible={pinningTo !== null}
        onPick={(photo) => {
          const boardId = pinningTo;
          if (!boardId) return;
          pending.current = () => router.push('/wall/create');
          startPinDraft(boardId, photo);
          // A Modal reports its dismissal on iOS only; everywhere else there
          // is nothing to wait for, so the push runs on the spot.
          if (Platform.OS !== 'ios') runPending();
        }}
        onDismiss={() => setPinningTo(null)}
        onDismissed={runPending}
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
  // closer to the bio than to the tabs below it: it belongs to the name, not
  // to the switch.
  stats: {
    alignSelf: 'stretch',
    marginTop: spacing.xl,
  },
  tabs: {
    marginTop: spacing.lg,
    marginBottom: spacing['2xl'],
  },
  joined: {
    marginHorizontal: -spacing.xl,
    paddingHorizontal: spacing.xl,
    // Exactly the half of the badge that hangs above the photos.
    paddingTop: joinedBadgeHeight / 2,
  },
  // The strip runs wider than the page gutter on either side, as it does on
  // Discover.
  joinedStrip: {
    marginHorizontal: -spacing.sm,
  },
  // Pinned to the top of the section rather than to the strip, so the badge's
  // waist lands on the strip's top edge.
  joinedBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  joinedPill: {
    alignSelf: 'center',
  },
  // Carries the card's fill and corner as well as the shadow: on iOS a
  // transparent host squares the shadow off at its bounds instead of letting
  // it follow the rounded edge.
  promoShadow: {
    marginTop: spacing['2xl'],
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  promoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xl,
  },
  // The art keeps its own proportions, so the cut-out never letterboxes.
  // The shadow sits on the image itself rather than on a wrapper: a
  // transparent wrapper squares it off at the bounds instead of letting it
  // follow the figure.
  promoArt: {
    width: 96,
    aspectRatio: 597 / 727,
    ...shadows.hard,
  },
  promoBody: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  promoList: {
    marginTop: spacing.sm,
  },
  promoAvatars: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  // The faces overlap, so each carries the card's own colour as a ring and the
  // one behind stops bleeding into the one in front.
  avatarRing: {
    borderWidth: 3,
    borderColor: colors.surface,
  },
  avatarOverlap: {
    marginLeft: -spacing.lg,
  },
});
