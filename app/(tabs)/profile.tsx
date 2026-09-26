import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { Avatar } from '@/components/Avatar';
import { BottomSheet } from '@/components/BottomSheet';
import {
  CalendarMonth,
  MONTH_NAMES,
  type CalendarDay,
  type DayShot,
} from '@/components/CalendarMonth';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { DayStamp } from '@/components/FriendCard';
import { IconButton } from '@/components/IconButton';
import { MosaicArrangement } from '@/components/PhotoCollage';
import { Placeholder } from '@/components/Placeholder';
import {
  profileActionTop,
  profileAvatarSize,
} from '@/components/ProfileLayout';
import { ScreenScroll, topPadding } from '@/components/Screen';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { Text } from '@/components/Text';
import { colors, radii, screenPadding, shadows, spacing } from '@/constants/theme';
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

/** The header's two round buttons match the corner "+" on Challenges, so
 * every tab root's title sits between buttons of the same size. */
const HEADER_BUTTON = 46;
const HEADER_ICON = 22;

/** The "3/5" count on a partly done day's tile: small enough to leave the
 * photo the main thing, big enough to read as a mark rather than a speck. */
const TILE_MARK = 22;

/** Height of the challenge card's progress bar — a hairline would vanish on
 * the muted fill, anything heavier starts to read as a second button. */
const PROGRESS_HEIGHT = 5;

/** Wide enough for "Grid" and "Month" with their glyphs; the pill track
 * splits it evenly so the chip slides between two fixed stops. */
const DAYS_SWITCH_WIDTH = 190;

/** Same hero circle the to-do ring and a friend's profile share — this is
 * the one place on the app's own profile that gets to be that big. */
const avatarSize = profileAvatarSize;

/**
 * Today at a glance, drawn as a ring around the photo: one segment per task
 * in the challenge, filled clockwise from 12 o'clock as tasks get done — so
 * opening a profile says straight away how the day is going. A clear gap
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

/** One arc of the ring, rotated into its slot. Round caps only between
 * segments — a single task's arc is the whole circle, with no end to cap. */
function ringSegment(
  segment: { length: number; rotation: number },
  index: number,
  stroke: string,
  capped: boolean,
) {
  return (
    <Circle
      key={index}
      cx={RING_SIZE / 2}
      cy={RING_SIZE / 2}
      r={RING_RADIUS}
      stroke={stroke}
      strokeWidth={RING_STROKE}
      strokeLinecap={capped ? 'round' : 'butt'}
      fill="none"
      strokeDasharray={`${segment.length} ${RING_CIRCUMFERENCE}`}
      transform={`rotate(${segment.rotation} ${RING_SIZE / 2} ${RING_SIZE / 2})`}
    />
  );
}

/** The badge sits centred on the bottom of the ring, the way the "Day N" pill
 * sits on the story ring — sized to that overlap, not to the type scale. */
const badgeHeight = 30;
const badgeRingWidth = 2;

/** Where the photo sits inside the ring's box: clear of the stroke and the
 * gap between them. */
const AVATAR_INSET = RING_STROKE + RING_GAP;
/** The friend code in its sheet: big enough to scan from a phone held across
 * a table, with room left for the title and caption above and below it. */
const FRIEND_CODE_SIZE = 220;

/** How far the badge hangs below the ring: centred on the stroke, then lifted
 * a step so more of it sits on the photo than under it. The name under it
 * steps down by exactly this, so the gap above the name is the same with the
 * badge as it was without. */
const badgeOverhang = (badgeHeight - RING_STROKE) / 2 - spacing.xs;

const DAY_MS = 86_400_000;

type DaysView = 'grid' | 'month';

export default function ProfileScreen() {
  const router = useRouter();
  const {
    profile,
    currentDay,
    totalDays,
    startDate,
    challenge,
    tasks,
    progress,
  } = useApp();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  // The line the title and the two corner buttons share — the same one every
  // other tab root uses: normally the corner button's own fixed offset,
  // dropping to meet the content on a deep safe-area inset, so switching
  // tabs never jumps the title up or down.
  const headerTop = Math.max(profileActionTop, topPadding(insets.top));
  const titleOffset = headerTop - topPadding(insets.top);

  // The header's QR button opens the friend code full-screen, big enough to
  // scan. The photo itself is edited in Settings now, not from here.
  const [codeOpen, setCodeOpen] = useState(false);
  const avatarSource = profile.avatar ?? profile.avatarSeed;
  const friendCodeUrl = Linking.createURL(`add-friend/${profile.handle.replace(/^@/, '')}`);

  const [daysView, setDaysView] = useState<DaysView>('grid');

  const doneOn = (day: number) =>
    tasks.filter((task) => progress[day]?.[task.id]?.done).length;
  // How many of today's tasks are ticked off — what the ring fills in.
  const doneToday = doneOn(currentDay);
  // Today is a story as soon as one task has its photo — until then there is
  // nothing to watch, and the photo is just a photo.
  const hasStoryToday = tasks.some((task) => {
    const entry = progress[currentDay]?.[task.id];
    return Boolean(entry?.photo || entry?.photoSeed);
  });
  const dayFinished = (day: number) => tasks.length > 0 && doneOn(day) === tasks.length;

  // Same order the day pager pages through — opening a tile and paging down
  // must land on the next tile in this exact sequence. Today only joins the
  // grid once it is finished: until then it is still a story in progress,
  // and the ring above already shows it.
  const postedDays = usePostedDays().filter(
    (day) => day < currentDay || dayFinished(day),
  );

  // Every posted day, most recent first — each one cut into the same merged
  // mosaic the to-do tab and a friend's own day use. Only the tasks that
  // actually got a photo take a slice of the cell: a day with three of five
  // shot reads as three prints, not three prints and two grey gaps.
  const posts = postedDays.map((day) => {
    const rows = tasks
      .map((task) => {
        const entry = progress[day]?.[task.id];
        return entry?.photo || entry?.photoSeed
          ? { key: task.id, photo: entry.photo ?? null, seed: entry.photoSeed ?? null }
          : null;
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
    return { key: `day-${day}`, day, rows, done: doneOn(day) };
  });

  const openDay = (day: number) =>
    router.push({ pathname: '/day/[day]', params: { day: String(day) } });

  // The challenge laid out as calendar months, from the one it started in to
  // this one. A past day with photos opens its post, exactly as its grid tile
  // does; today opens Tasks, where the day is actually being done; a missed
  // day and a day still to come have nothing to open.
  const months = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    /** Which challenge day a calendar date is, or null if it is outside it.
     * Rounded rather than floored: a daylight-saving shift puts a fractional
     * day between two dates, which would otherwise slide every date after it
     * back by one. */
    const dayNumber = (date: Date) => {
      const n = Math.round((date.getTime() - startDate.getTime()) / DAY_MS) + 1;
      return n >= 1 && n <= totalDays ? n : null;
    };
    const shotsFor = (day: number) =>
      tasks.flatMap<DayShot>((task) => {
        const row = progress[day]?.[task.id];
        if (row?.photo) return [{ photo: row.photo, seed: null }];
        if (row?.photoSeed) return [{ photo: null, seed: row.photoSeed }];
        return [];
      });
    const doneCount = (day: number) =>
      tasks.filter((task) => progress[day]?.[task.id]?.done).length;

    const out: { key: string; month: Date; days: Record<number, CalendarDay> }[] = [];
    const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const last = new Date(today.getFullYear(), today.getMonth(), 1);

    while (cursor <= last) {
      const year = cursor.getFullYear();
      const month = cursor.getMonth();
      const length = new Date(year, month + 1, 0).getDate();
      const days: Record<number, CalendarDay> = {};

      for (let date = 1; date <= length; date += 1) {
        const on = new Date(year, month, date);
        const day = dayNumber(on);
        const isToday = on.getTime() === today.getTime();
        const shots = day === null ? [] : shotsFor(day);
        const done = day === null ? 0 : doneCount(day);
        const cell: CalendarDay = { shots, past: on <= today, today: isToday };

        if (day !== null && day < currentDay) {
          if (done === tasks.length) cell.mark = 'done';
          else if (shots.length) cell.mark = `${done}/${tasks.length}`;
          else cell.missed = true;
          if (shots.length) {
            cell.onPress = () =>
              router.push({ pathname: '/day/[day]', params: { day: String(day) } });
            cell.label = `Day ${day}, ${done} of ${tasks.length} tasks. Opens this day's post.`;
          } else {
            cell.label = `${MONTH_NAMES[month]} ${date}, Day ${day}. Missed.`;
          }
        } else if (day !== null && isToday) {
          if (done) cell.mark = `${done}/${tasks.length}`;
          cell.onPress = () => router.push('/tasks');
          cell.label = `Today, Day ${day}, ${done} of ${tasks.length} so far. Opens Tasks.`;
        }
        days[date] = cell;
      }

      out.push({ key: `${year}-${month}`, month: new Date(year, month, 1), days });
      cursor.setMonth(month + 1);
    }
    return out;
  }, [startDate, totalDays, currentDay, tasks, progress, router]);

  const progressShare = Math.min(1, currentDay / Math.max(totalDays, 1));

  return (
    <View style={styles.screenRoot}>
      {/* The Profile tab breaks from the warm app shell and sits on white,
          the way the reference screen does. */}
      <ScreenScroll tabBar tone="plain">
        {/* The title scrolls with the page; the two buttons either side of it
            are pinned over the scroll below, so they stay in reach however
            far down the days go. */}
        <View style={[styles.header, { marginTop: titleOffset }]}>
          <Text variant="sectionTitle" center>
            My Profile
          </Text>
        </View>

        <View style={styles.identity}>
          <View
            style={styles.ringWrap}
            accessibilityLabel={`Day ${currentDay} of ${totalDays}, ${doneToday} of ${tasks.length} tasks done today`}
          >
            {/* Counted, not matched to a task: the ring says how many are
                done, filling from the top, whichever ones they were. Done
                segments wear the same full ink the Days calendar marks a
                finished day and today with, so the ring and the grid below
                it read as one record; open ones take the empty-day grey the
                story ring uses. */}
            <Svg width={RING_SIZE} height={RING_SIZE} style={styles.ringSvg}>
              {ringSegments(tasks.length).map((segment, index) =>
                ringSegment(
                  segment,
                  index,
                  index < doneToday ? colors.ink : colors.inkGhost,
                  tasks.length > 1,
                ),
              )}
            </Svg>

            {/* The disc behind the photo is the avatar's own shape, so the
                hard shadow has something solid to cast from. A tap plays
                today's story — the ring around it is that story's progress —
                and does nothing on a day with no photo yet. */}
            <View style={[styles.avatarDisc, shadows.hard]}>
              <Pressable
                accessibilityRole={hasStoryToday ? 'button' : undefined}
                accessibilityLabel={hasStoryToday ? "Watch today's story" : 'Profile photo'}
                disabled={!hasStoryToday}
                onPress={() =>
                  router.push({ pathname: '/story', params: { day: String(currentDay) } })
                }
                style={({ pressed }) => pressed && styles.pressed}
              >
                <Avatar source={avatarSource} size={avatarSize} />
              </Pressable>
            </View>

            {/* Today's count clipped onto the bottom of the gauge — the ring
                shows how far along, the badge says it in numbers. Hidden from
                screen readers: the ring's own label already says it. */}
            <View
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[styles.badge, shadows.hard]}
            >
              <Text variant="microBold" color={colors.inkInverse}>
                {`${doneToday}/${tasks.length}`}
              </Text>
            </View>
          </View>

          {/* Stacked under the photo and centred on it. Editing any of it is
              Settings' job, not a tap here — and a missing bio is simply left
              out rather than standing in as placeholder text. */}
          <View style={styles.identityText}>
            <Text variant="sectionTitle" center>
              {profile.name}
            </Text>
            <Text variant="bodyBold" color={colors.inkMuted} center>
              {profile.handle}
            </Text>
            {profile.bio ? (
              <Text variant="bodyBold" color={colors.inkFaded} center style={styles.bio}>
                {profile.bio}
              </Text>
            ) : null}
          </View>
        </View>

        {/* The challenge the ring is measuring, how far into it you are, and
            a way into its page. */}
        <Card
          muted
          flat
          padded={false}
          radius={radii.lg}
          onPress={() => router.push({ pathname: '/feed/[id]', params: { id: challenge.id } })}
          style={styles.challengeCard}
        >
          <View style={styles.challengeBody}>
            <View style={styles.challengeRow}>
              <Text variant="cardTitleBold" numberOfLines={1} style={styles.challengeName}>
                {challenge.name}
              </Text>
              <Text variant="labelBold">
                Day {currentDay}
                <Text variant="labelBold" color={colors.inkFaded}>
                  {` / ${totalDays}`}
                </Text>
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressShare * 100}%` }]} />
            </View>
          </View>
        </Card>

        <View style={styles.daysHeader}>
          <Text variant="sectionTitle">Days</Text>
          <SegmentedTabs
            variant="pill"
            options={[
              { key: 'grid', label: 'Grid', icon: 'grid-outline' },
              { key: 'month', label: 'Month', icon: 'calendar-outline' },
            ]}
            value={daysView}
            onChange={setDaysView}
            style={styles.daysSwitch}
          />
        </View>

        {daysView === 'month' ? (
          months.map((entry) => (
            <CalendarMonth
              key={entry.key}
              month={entry.month}
              days={entry.days}
              style={styles.month}
            />
          ))
        ) : posts.length === 0 ? (
          <EmptyState
            icon="camera-outline"
            title="No days yet"
            hint="Finish a day's tasks to see it here."
          />
        ) : (
          <View style={styles.postGrid}>
            {posts.map((post) => {
              const finished = post.done === tasks.length;
              return (
                <View key={post.key} style={styles.postCellWrap}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      finished
                        ? `Day ${post.day}, finished`
                        : `Day ${post.day}, ${post.done} of ${tasks.length} tasks`
                    }
                    onPress={() => openDay(post.day)}
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

                    {/* The opened post's own stamp, set at the post's width
                        — its photos run edge to edge, so the window's — and
                        scaled down whole, so the tile is a miniature of the
                        post rather than a pile of photos with a label. */}
                    <DayStamp day={post.day} kicker={challenge.name} referenceWidth={windowWidth} />

                    {/* Only a day that fell short says so — a finished day is
                        just its photos. */}
                    {finished ? null : (
                      <View style={styles.tileCount}>
                        <Text variant="micro" color={colors.ink}>
                          {`${post.done}/${tasks.length}`}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
      </ScreenScroll>

      {/* Your friend code on one side, settings on the other: two round
          buttons the size of the Challenges "+", pinned to the title's line
          and measured from the screen edge rather than the scroll content,
          so they never scroll away. */}
      <IconButton
        name="qr-code-outline"
        size={HEADER_BUTTON}
        iconSize={HEADER_ICON}
        background={colors.surface}
        onPress={() => setCodeOpen(true)}
        accessibilityLabel="Show my friend code"
        style={[styles.cornerLeft, { top: headerTop }]}
      />
      <IconButton
        name="settings-outline"
        size={HEADER_BUTTON}
        iconSize={HEADER_ICON}
        background={colors.surface}
        onPress={() => router.push('/account/settings')}
        accessibilityLabel="Settings"
        style={[styles.cornerRight, { top: headerTop }]}
      />

      {/* The friend code slides up from the bottom the way the comments do:
          something to hold out to a friend for a moment, over the profile,
          and swiped or tapped away when they've scanned it. */}
      <BottomSheet visible={codeOpen} onDismiss={() => setCodeOpen(false)}>
        <View style={styles.codeSheet}>
          <Text variant="sectionTitleXs" center>
            Your QR code
          </Text>
          <View style={styles.codeTile}>
            <QRCode
              value={friendCodeUrl}
              size={FRIEND_CODE_SIZE}
              color={colors.ink}
              backgroundColor={colors.surface}
            />
          </View>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
  // Sized to the corner buttons, so the title centres on the same line as
  // the two pinned beside it — the way Challenges lines its title up with
  // its own "+".
  header: {
    minHeight: HEADER_BUTTON,
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  cornerLeft: {
    position: 'absolute',
    left: screenPadding,
  },
  cornerRight: {
    position: 'absolute',
    right: screenPadding,
  },
  identity: {
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
  codeSheet: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingBottom: spacing.md,
  },
  // A solid white square under the code, lifted off the sheet: a scanner
  // needs the code on flat white with a quiet margin round it.
  codeTile: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  avatarDisc: {
    position: 'absolute',
    top: AVATAR_INSET,
    left: AVATAR_INSET,
    width: avatarSize,
    height: avatarSize,
    borderRadius: avatarSize / 2,
    backgroundColor: colors.backgroundPlain,
  },
  // Centred on the ring's own stroke rather than its outer edge, so it reads
  // as clipped onto the gauge instead of hanging off under it. The wrap's own
  // `alignItems` does the horizontal centring.
  badge: {
    position: 'absolute',
    zIndex: 1,
    bottom: -badgeOverhang,
    height: badgeHeight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
    // A ring the page's own white so the badge reads as sitting on top of the
    // gauge rather than merging into its stroke.
    borderWidth: badgeRingWidth,
    borderColor: colors.backgroundPlain,
  },
  identityText: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: spacing.lg + badgeOverhang,
  },
  bio: {
    marginTop: 2,
  },
  challengeCard: {
    marginTop: spacing.xl,
  },
  challengeBody: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  challengeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  challengeName: {
    flex: 1,
  },
  progressTrack: {
    height: PROGRESS_HEIGHT,
    borderRadius: radii.pill,
    backgroundColor: colors.dividerStrong,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
  },
  daysHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing['2xl'],
    marginBottom: spacing.md,
  },
  daysSwitch: {
    width: DAYS_SWITCH_WIDTH,
  },
  month: {
    marginBottom: spacing['2xl'],
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
  tileCount: {
    position: 'absolute',
    right: spacing.xs,
    bottom: spacing.xs,
    height: TILE_MARK,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
});
