import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Directions, Gesture, GestureDetector } from 'react-native-gesture-handler';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';
import { MosaicArrangement } from '@/components/PhotoCollage';
import { PhotoLibrarySheet } from '@/components/PhotoLibrarySheet';
import { PhotoViewer } from '@/components/PhotoViewer';
import { Pill } from '@/components/Pill';
import { Placeholder } from '@/components/Placeholder';
import {
  profileActionHeight,
  profileActionTop,
  profileAvatarSize,
} from '@/components/ProfileLayout';
import { ScreenScroll, topPadding } from '@/components/Screen';
import { Text } from '@/components/Text';
import { colors, radii, shadows, spacing } from '@/constants/theme';
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

/**
 * Today at a glance, drawn as a ring around the photo: one segment per task
 * in the challenge, blacked in clockwise from 12 o'clock as tasks get done —
 * so opening a profile says straight away how the day is going. A clear gap
 * between the ring and the photo keeps it reading as a gauge around the
 * avatar, not a coloured border on it.
 */
const RING_STROKE = 6;
const RING_GAP = 5;
const RING_SIZE = avatarSize + (RING_STROKE + RING_GAP) * 2;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
/** The visible gap between two segments, measured along the ring. */
const RING_SEGMENT_GAP = 7;

/**
 * One arc per task, each rotated into its own slot. Round caps grow every
 * arc by half a stroke at each end, so the drawn length gives that back to
 * keep the gaps the size they say. A single task is the whole circle, with
 * no gap to leave.
 */
function ringSegments(count: number): { length: number; rotation: number }[] {
  if (count <= 1) return [{ length: RING_CIRCUMFERENCE, rotation: -90 }];
  const slot = RING_CIRCUMFERENCE / count;
  const length = Math.max(0.01, slot - RING_SEGMENT_GAP - RING_STROKE);
  // Shifts each arc half a gap off its slot's edge, so the gap straddles
  // 12 o'clock rather than the first segment starting on it.
  const inset = (((RING_SEGMENT_GAP + RING_STROKE) / 2) / RING_CIRCUMFERENCE) * 360;
  return Array.from({ length: count }, (_, i) => ({
    length,
    rotation: -90 + (i * 360) / count + inset,
  }));
}


/** The day badge sits centred on the bottom of the ring, the way the "Day N"
 * pill sits on the story ring — sized to that overlap, not to the type scale. */
const dayBadgeHeight = 30;
const dayBadgeRingWidth = 2;

/** The friend code on the back of the photo: a white disc the photo's own
 * size, inside the ring, so the flip swaps one for the other without anything
 * around it moving. The code is the largest square that fits inside that
 * circle, less a step so its corner markers keep clear of the rim — the white
 * around it is the quiet zone a scanner needs. */
const FRIEND_CODE_SIZE = Math.floor(avatarSize / Math.SQRT2) - spacing.xs * 2;
/** Where the photo sits inside the ring's box: clear of the stroke and the
 * gap between them. The code's disc is laid at the same spot. */
const AVATAR_INSET = RING_STROKE + RING_GAP;
/** Long enough to read as a card turning over, short enough that a second
 * swipe straight after doesn't feel held up. */
const FLIP_DURATION = 300;
/** The code opened full-screen fills the viewer's own photo frame — the
 * screen less the viewer's page padding — less a white margin inside it,
 * which doubles as the quiet zone a scanner needs. */
const FRIEND_CODE_ZOOM_MARGIN = spacing.xl;

/** How far the badge hangs below the ring: centred on the stroke, then lifted
 * a step so more of it sits on the photo than under it. The name under it
 * steps down by exactly this, so the gap above the name is the same with the
 * badge as it was without. */
const dayBadgeOverhang = (dayBadgeHeight - RING_STROKE) / 2 - spacing.xs;

export default function ProfileScreen() {
  const router = useRouter();
  const {
    profile,
    currentDay,
    totalDays,
    challenge,
    setAvatarPhoto,
    setAvatarSeed,
    tasks,
    progress,
  } = useApp();
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // The same title line every other tab sets its heading on — normally the
  // corner button's own fixed offset, dropping to meet the content on a deep
  // safe-area inset — so switching tabs never jumps the title up or down.
  const titleOffset =
    Math.max(profileActionTop, topPadding(insets.top)) - topPadding(insets.top);

  // The circle goes straight to the library sheet — no source dialog in
  // between, since picking is the only thing the tap can mean.
  const [libraryOpen, setLibraryOpen] = useState(false);

  // A tap on either face blows it up full-screen: the photo, with Edit and
  // Remove under it, or the code, big enough to scan. Edit opens the library
  // once the viewer is gone — on iOS a sheet presented over a modal that is
  // still fading out never shows — so it is parked here until then.
  const [viewer, setViewer] = useState<'photo' | 'code' | null>(null);
  const libraryAfterViewer = useRef(false);
  const avatarSource = profile.avatar ?? profile.avatarSeed;
  const hasAvatar = Boolean(avatarSource);

  // A sideways swipe on the photo turns it over to your friend code — a QR
  // of the link that opens "add this person" on whoever scans it. The ref
  // holds the truth for the gesture callback, which outlives any one
  // render; the state is only there to re-render the faces' touch handling.
  const [showingCode, setShowingCode] = useState(false);
  const showingCodeRef = useRef(false);
  const flip = useRef(new Animated.Value(0)).current;
  // When the last turn started. A quick flick can also land as a tap on the
  // photo underneath it — the fling fires mid-move, the tap on release — so
  // for as long as a turn is running, taps on either face are ignored rather
  // than opening the library or turning it straight back.
  const lastFlipAt = useRef(0);
  const flippedJustNow = () => Date.now() - lastFlipAt.current < FLIP_DURATION;
  const toggleCode = useCallback(() => {
    lastFlipAt.current = Date.now();
    const next = !showingCodeRef.current;
    showingCodeRef.current = next;
    setShowingCode(next);
    Animated.timing(flip, {
      toValue: next ? 1 : 0,
      duration: FLIP_DURATION,
      useNativeDriver: true,
    }).start();
  }, [flip]);
  // A fling rather than a pan: it only fires on a deliberate sideways flick,
  // so a tap on the photo still opens the library and the page still
  // scrolls. No reanimated in the app, so the callback runs on the JS side.
  const flipGesture = useMemo(
    () =>
      Gesture.Fling()
        .direction(Directions.LEFT | Directions.RIGHT)
        .runOnJS(true)
        .onStart(toggleCode),
    [toggleCode],
  );
  const friendCodeUrl = Linking.createURL(`add-friend/${profile.handle.replace(/^@/, '')}`);

  // The turn is drawn flat: the showing face narrows to a sliver across its
  // width, and the other opens back out of it. A true 3D rotation swings the
  // near edge towards the screen and out past the photo's own circle, where
  // it draws across the day badge whatever the stacking order says — a flat
  // squeeze never leaves the circle, so the badge always stays on top.
  const frontFace = {
    transform: [
      { scaleX: flip.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0, 0] }) },
    ],
  };
  const backFace = {
    transform: [
      { scaleX: flip.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] }) },
    ],
  };

  // Same order the day pager pages through — opening a tile and paging down
  // must land on the next tile in this exact sequence.
  const postedDays = usePostedDays();

  // How many of today's tasks are ticked off — what the ring blacks in.
  const doneToday = tasks.filter((task) => progress[currentDay]?.[task.id]?.done).length;

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
        <View style={[styles.header, { marginTop: titleOffset }]}>
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
            <GestureDetector gesture={flipGesture}>
              <View
                collapsable={false}
                style={styles.ringWrap}
                accessibilityLabel={`Day ${currentDay} of ${totalDays}, ${doneToday} of ${tasks.length} tasks done today`}
              >
                <Svg width={RING_SIZE} height={RING_SIZE} style={styles.ringSvg}>
                  {ringSegments(tasks.length).map((segment, index) => (
                    <Circle
                      key={index}
                      cx={RING_SIZE / 2}
                      cy={RING_SIZE / 2}
                      r={RING_RADIUS}
                      // Counted, not matched to a task: the ring says how many
                      // are done, filling from the top, whichever ones they were.
                      // Open segments take the empty-day grey the story ring
                      // uses — the paler surface grey all but vanished on white.
                      stroke={index < doneToday ? colors.ink : colors.inkGhost}
                      strokeWidth={RING_STROKE}
                      strokeLinecap={tasks.length > 1 ? 'round' : 'butt'}
                      fill="none"
                      strokeDasharray={`${segment.length} ${RING_CIRCUMFERENCE}`}
                      transform={`rotate(${segment.rotation} ${RING_SIZE / 2} ${RING_SIZE / 2})`}
                    />
                  ))}
                </Svg>

                {/* Both sides of the photo share one box, stacked under the
                    badge — the turn happens inside it. */}
                <View style={styles.photoFaces}>
                  {/* Only the photo turns over — the ring and the day badge
                      stay put around it, so the gauge still reads while the
                      code is up. A plain circle rather than the Instagram-style
                      gradient ring — the disc behind it is the avatar's own
                      shape, so the shadow still has something solid to cast
                      from. */}
                  <Animated.View
                    style={[styles.avatarShadow, shadows.hard, frontFace]}
                    pointerEvents={showingCode ? 'none' : 'auto'}
                    accessibilityElementsHidden={showingCode}
                    importantForAccessibility={showingCode ? 'no-hide-descendants' : 'auto'}
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={hasAvatar ? 'View profile photo' : 'Add profile photo'}
                      accessibilityHint="Swipe sideways to show your friend code"
                      accessibilityActions={[{ name: 'friendCode', label: 'Show friend code' }]}
                      onAccessibilityAction={toggleCode}
                      onPress={() => {
                        if (flippedJustNow()) return;
                        // Nothing to look at yet — go straight to picking one.
                        if (hasAvatar) setViewer('photo');
                        else setLibraryOpen(true);
                      }}
                      style={({ pressed }) => pressed && styles.pressed}
                    >
                      <Avatar
                        source={avatarSource}
                        size={avatarSize}
                      />
                    </Pressable>
                  </Animated.View>

                  {/* The back of the photo: your friend code, on a white disc
                      the photo's own size and in its place, lifted with the
                      avatar's own hard shadow since it stands in for it. */}
                  <Animated.View
                    style={[styles.friendCode, shadows.hard, backFace]}
                    pointerEvents={showingCode ? 'auto' : 'none'}
                    accessible={showingCode}
                    accessibilityElementsHidden={!showingCode}
                    importantForAccessibility={showingCode ? 'yes' : 'no-hide-descendants'}
                    accessibilityLabel="Your friend code. Scanning it adds you as a friend."
                    accessibilityActions={[{ name: 'photo', label: 'Show profile photo' }]}
                    onAccessibilityAction={toggleCode}
                  >
                    {/* A tap on the code opens it full-screen, big enough to
                        scan; a swipe turns it back. */}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Open friend code full screen"
                      onPress={() => {
                        if (!flippedJustNow()) setViewer('code');
                      }}
                      style={({ pressed }) => pressed && styles.pressed}
                    >
                      <QRCode
                        value={friendCodeUrl}
                        size={FRIEND_CODE_SIZE}
                        color={colors.ink}
                        backgroundColor={colors.surface}
                      />
                    </Pressable>
                  </Animated.View>
                </View>

                {/* How far into the challenge, clipped onto the bottom of the
                    gauge — the ring says how today is going, the badge which
                    day today is. Drawn last so it sits over whichever face is
                    showing. Hidden from screen readers: the ring's own label
                    already says it. */}
                <View
                  pointerEvents="none"
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  style={[styles.dayBadge, shadows.hard]}
                >
                  <Text variant="microBold" color={colors.inkInverse}>
                    Day {currentDay}
                  </Text>
                </View>
              </View>
            </GestureDetector>

            {/* Stacked under the photo and centred on it, the way the
                reference sets it. */}
            <View style={styles.identityText}>
              <Text variant="sectionTitle" center>
                {profile.name}
              </Text>
              <Text variant="bodyBold" color={colors.inkMuted} center>
                {profile.handle}
              </Text>

              {/* Read-only here: editing the bio is Settings' job now, not a
                  tap on the profile page itself. */}
              <Text
                variant="bodyBold"
                color={colors.inkMuted}
                center
                style={styles.bio}
              >
                {profile.bio ?? 'No bio yet'}
              </Text>

              {/* Which challenge the ring and the day badge are measuring —
                  a pill rather than a caption so it reads as a thing you can
                  open, and it does: straight to the challenge's preview, the
                  same page a friend's card and a day's header open. */}
              <Pill
                label={challenge.name}
                tone="muted"
                bold
                trailingIcon="chevron-forward"
                onPress={() =>
                  router.push({ pathname: '/feed/[id]', params: { id: challenge.id } })
                }
                style={styles.challengePill}
              />
            </View>
          </View>
        </View>

        {/* No card and no rule above it — the "Days" heading is enough to
            open the grid after the identity column. */}
        <View style={styles.gridSection}>
          <Text variant="sectionTitle" style={styles.gridTitle}>
            Days
          </Text>

          {/* Every day so far, cut into the same merged mosaic the to-do
              tab and a friend's own day use — a day here reads exactly as
              it does everywhere else in the app. Likes and comments sit on
              the photo itself, washed in behind them the way the calendar's
              own day cell prints a label straight onto a photo. */}
          {posts.length === 0 ? (
            <EmptyState
              icon="camera-outline"
              title="No days yet"
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

      <PhotoViewer
        photos={avatarSource ? [avatarSource] : []}
        index={viewer === 'photo' ? 0 : null}
        onDismiss={() => setViewer(null)}
        onDismissed={() => {
          if (!libraryAfterViewer.current) return;
          libraryAfterViewer.current = false;
          setLibraryOpen(true);
        }}
        actions={[
          {
            key: 'edit',
            label: 'Edit',
            icon: 'pencil',
            onPress: () => {
              setViewer(null);
              // iOS waits for the viewer to finish fading; nowhere else
              // loses a sheet presented straight away.
              if (Platform.OS === 'ios') libraryAfterViewer.current = true;
              else setLibraryOpen(true);
            },
          },
          {
            key: 'remove',
            label: 'Remove',
            icon: 'trash-outline',
            destructive: true,
            onPress: () => {
              setAvatarPhoto(null);
              setAvatarSeed(null);
              setViewer(null);
            },
          },
        ]}
      />

      {/* The friend code blown up in the same frame the photo opens in, so
          the two sides of the circle open to the same size. */}
      <PhotoViewer photos={[]} index={viewer === 'code' ? 0 : null} onDismiss={() => setViewer(null)}>
        <QRCode
          value={friendCodeUrl}
          size={screenWidth - (spacing['2xl'] + FRIEND_CODE_ZOOM_MARGIN) * 2}
          color={colors.ink}
          backgroundColor={colors.surface}
        />
        <Text variant="bodyBold" color={colors.inkMuted} center style={styles.codeCaption}>
          Scan to add {profile.handle}
        </Text>
      </PhotoViewer>

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
  // The shared title band: the same height and gap below as Challenges,
  // Community, Tasks and Calendar give their own.
  header: {
    minHeight: profileActionHeight,
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
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringSvg: {
    position: 'absolute',
  },
  // Pinned to the frame's foot rather than stacked under the code, so the
  // code stays dead centre in the frame the way the photo does.
  codeCaption: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: FRIEND_CODE_ZOOM_MARGIN,
  },
  // The photo's own box inside the ring, holding both of its faces.
  photoFaces: {
    position: 'absolute',
    top: AVATAR_INSET,
    left: AVATAR_INSET,
    width: avatarSize,
    height: avatarSize,
  },
  // Laid exactly over the photo so the flip swaps one for the other in place.
  friendCode: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: avatarSize,
    height: avatarSize,
    borderRadius: avatarSize / 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Centred on the ring's own stroke rather than its outer edge, so it reads
  // as clipped onto the gauge instead of hanging off under it. The wrap's own
  // `alignItems` does the horizontal centring. Raised over the photo's box so
  // the turning faces always pass underneath it.
  dayBadge: {
    position: 'absolute',
    zIndex: 1,
    bottom: -dayBadgeOverhang,
    height: dayBadgeHeight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
    // A ring the page's own white so the badge reads as sitting on top of the
    // gauge rather than merging into its stroke.
    borderWidth: dayBadgeRingWidth,
    borderColor: colors.backgroundPlain,
  },
  avatarShadow: {
    width: avatarSize,
    height: avatarSize,
    borderRadius: avatarSize / 2,
    backgroundColor: colors.backgroundPlain,
  },
  // Stretched to the page's own width rather than its widest line, so the
  // challenge band inside it has the full width to run across.
  identityText: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: spacing.lg + dayBadgeOverhang,
  },
  bio: {
    marginTop: 2,
  },
  // Pill defaults to flex-start, which would beat the column's centring.
  // Keeps the pill's own full round, on a cool grey rather than the muted
  // tone's warmer fill.
  challengePill: {
    alignSelf: 'center',
    marginTop: spacing.md,
    backgroundColor: colors.surfaceSunken,
  },
  gridSection: {
    marginTop: spacing.xl,
  },
  gridTitle: {
    marginBottom: spacing.md,
  },
  // Edge to edge — the reference's own photo grid runs the full page width,
  // no gutter either side — the gap lives between tiles (on `postCellWrap`
  // below), not inside one.
  postGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  // Half the gap on each side of every tile, so two neighbours add up to a
  // full `xs` gap between them.
  postCellWrap: {
    width: '33.333%',
    padding: spacing.xs / 2,
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
