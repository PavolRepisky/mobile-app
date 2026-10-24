import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Fragment, useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  useColorScheme,
  type StyleProp,
  type ViewStyle,
  type ColorValue,
} from 'react-native';
import Svg, { Circle, Defs, G, Mask } from 'react-native-svg';

import { colors, colorsFor, layout, radii, shadows } from '@/constants/theme';
import { shortDate } from '@/lib/format';
import type { ImageSourcePropType } from '@/lib/imageSource';
import { Avatar, type AvatarSource } from './Avatar';
import { ChallengeRun, type RunDay } from './ChallengeRun';
import { EmptyState } from './EmptyState';
import { DayCover, POST_RATIO } from './DayCover';
import type { PhotoSource } from './PhotoStrip';
import { Pill } from './Pill';
import { ScreenHeader, type ScreenHeaderProps } from './ScreenHeader';
import { accentAt } from './TaskRing';
import { Text } from './Text';

/** The seam between day tiles: the theme's gap between tiles in a grid —
 * now that each tile is a mosaic of photos with none between them, a
 * hairline seam let neighbouring days run together; this much page keeps
 * each day its own post while the era still reads as one wall. */
const PHOTO_GRID_SEAM = layout.grid;

/** How many of an era's days show under its header row, which opens the
 * rest: one row of three for every era, the one on now included, so each
 * reads as a glimpse and the next era's header is never far down. */
const PREVIEW_DAYS = 3;
/** The chevron closing an era's header row — a list row's disclosure arrow. */
const ERA_CHEVRON = 15;

/** The upright rule between two of the stats — about their capitals'
 * height, so it parts them without standing taller than the words. */
const STAT_RULE = 14;

/** The prints fanned on the between-eras card: a phone photo's upright
 * shape at a thumbnail's size, laid over one another by close to half their
 * width — a tight stack, so the words beside it keep their room — and each
 * turned a little its own way, like prints dropped on a table. */
const PRINT_WIDTH = 72;
const PRINT_HEIGHT = 94;
const PRINT_OVERLAP = 30;
const PRINT_BORDER = 3;
const PRINT_TILTS = [-6, 3, 8] as const;

/** The hero circle — the one place on a profile that gets to be that big. */
const avatarSize = 120;

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
  stroke: ColorValue,
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

/**
 * The accent runs *around* the ring rather than across its box: peach where
 * the first segment starts at 12 o'clock, rose halfway round, lavender by the
 * time the last segment closes — the warm end leads, so the first task ticked
 * off lands in the brightest colour. SVG has no conic gradient, so the sweep
 * is drawn as this many thin arcs, each one flat-coloured for its angle — at
 * a 4° step the banding is below what the eye picks out on a 6pt stroke.
 */
const RING_SWEEP_SLICES = 90;
/** How far each slice overlaps the next, along the ring — butted edge to
 * edge, anti-aliasing leaves a hairline seam of background between them. */
const RING_SWEEP_OVERLAP = 0.6;

/** The sweep's slices, clockwise from 12 o'clock. */
const ringSweep = Array.from({ length: RING_SWEEP_SLICES }, (_, i) => ({
  rotation: -90 + (i * 360) / RING_SWEEP_SLICES,
  // Coloured at the slice's middle, so the first and last land just inside
  // the two end stops rather than exactly on them.
  color: accentAt((i + 0.5) / RING_SWEEP_SLICES),
}));

/** Where the photo sits inside the ring's box: clear of the stroke and the
 * gap between them. */
const AVATAR_INSET = RING_STROKE + RING_GAP;

/** One empty list for every profile with no earlier eras, so the month's
 * memo doesn't see a new one each render. */
const NO_RUNS: readonly ProfileRun[] = [];

/** One of a day's proof photos, keyed by its task. */
export interface ProfileShot {
  key: string;
  photo: ImageSourcePropType | null;
  seed: string | null;
}

/** What a profile knows about one challenge day. */
export interface ProfileDay {
  /** Its photos, in checklist order. */
  shots: readonly ProfileShot[];
  /** How many of its tasks were done. */
  done: number;
}

/** An era the profile ran before the current one, its days kept on the page
 * in a group of their own after the current era's. */
export interface ProfileRun {
  key: string;
  /** The era's name, over its group of days. */
  name: string;
  startDate: Date;
  totalDays: number;
  /** How it ended: seen through, out of lives, or left. */
  status: 'finished' | 'lost' | 'left';
  /** The day it ended on — its length when finished. */
  lastDay: number;
  taskCount: number;
  dayOf: (day: number) => ProfileDay | null;
  /** Its days in the grid, most recent first. */
  posted: readonly number[];
  onOpenDay: (day: number) => void;
}

export interface ProfileViewProps {
  avatar: AvatarSource;
  name: string;
  bio: string | null;
  /** Null for an account in no era: the ring and the era's name go, and
   * only past eras' days are left to show. */
  challenge: { id: string; name: string; joined: number } | null;
  startDate: Date;
  /** The run's day today; 0 before Day 1, when the card says when it starts. */
  currentDay: number;
  totalDays: number;
  /** Tasks in a day — the ring's segments and every "3/5". */
  taskCount: number;
  /** A day's record, or null where the profile has none to show. */
  dayOf: (day: number) => ProfileDay | null;
  /** The days in the grid, most recent first. */
  posted: readonly number[];
  /** Eras run before this one, most recent first. */
  pastRuns?: readonly ProfileRun[];
  /** Plays today's story from the photo; left out while there's none. */
  onPlayStory?: () => void;
  /** Opens a day of the era on now, in the era's feed, from its tile or
   * the era's "All 30 days". */
  onOpenDay: (day: number) => void;
  /** The era's lives, shown as hearts on the run card. */
  lives?: { left: number; total: number };
  /** How many friends they have; left out until it has loaded, and the
   * stat shows a dash. */
  friendCount?: number;
  /** What the grid says while it has no days in it. */
  emptyHint: string;
  /** The heading over the eras' grids — "My Eras" on your own page. */
  daysTitle?: string;
  /** Between eras, a card in the run's place asking you into the next one:
   * a few of the joinable eras' photos, who's in them, and the way to
   * Discover. Your own page only — on someone else's, nothing stands there. */
  nextEra?: { photos: readonly PhotoSource[]; hint: string; onFind: () => void };
  /** A row of buttons under the bio — on someone else's page, where you
   * stand with them and Share. One without `onPress` is a status, not a
   * button — "Friends". */
  actions?: readonly { label: string; onPress?: () => void }[];
  style?: StyleProp<ViewStyle>;
}

/**
 * A profile's whole page under its header — the photo in its task ring,
 * name and bio (the handle is `ProfileHeader`'s title), the era's name, and the days as one grid — no
 * calendar, and no missed days: the page shows what was done. Your own Profile tab and anyone else's profile are both this, so
 * the two can't drift: only the header differs, where yours carries
 * Settings and theirs the way back.
 */
export function ProfileView({
  avatar,
  name,
  bio,
  challenge,
  startDate,
  currentDay,
  totalDays,
  taskCount,
  dayOf,
  posted,
  pastRuns = NO_RUNS,
  onPlayStory,
  onOpenDay,
  lives,
  friendCount,
  emptyHint,
  daysTitle = 'Days',
  nextEra,
  actions,
  style,
}: ProfileViewProps) {
  // Plain colours for the appearance on show, for the ring's SVG, which
  // takes no adaptive ones.
  const svgColors = colorsFor(useColorScheme());
  const router = useRouter();

  // How many of today's tasks are ticked off — what the ring fills in.
  const doneToday = dayOf(currentDay)?.done ?? 0;

  // The days in one group per era — the one on now first, then each earlier
  // one, most recent first — under a header naming it, how a past one
  // ended, and how many days it has. An era with nothing posted yet has no
  // group.
  const runs = [
    ...(challenge
      ? [{
          key: 'now',
          name: challenge.name,
          taskCount,
          totalDays,
          dayOf,
          posted,
          onOpenDay,
          badge: null,
        }]
      : []),
    ...pastRuns.map((run) => ({
      ...run,
      badge:
        run.status === 'finished'
          ? 'Finished'
          : run.status === 'lost'
            ? 'Out of lives'
            : 'Left',
    })),
  ];
  const groups = runs
    .map((run) => {
      const posts = run.posted.flatMap((day) => {
        const record = run.dayOf(day);
        return record
          ? [{
              key: `${run.key}-day-${day}`,
              day,
              taskCount: run.taskCount,
              totalDays: run.totalDays,
              rows: record.shots,
              done: record.done,
              open: () => run.onOpenDay(day),
            }]
          : [];
      });
      return {
        key: run.key,
        name: run.name,
        detail: `${posts.length} ${posts.length === 1 ? 'day' : 'days'}`,
        badge: run.badge,
        posts,
      };
    })
    .filter((group) => group.posts.length > 0);

  // The profile in three counts, as one line: the longest stretch of days
  // finished back to back in any one era (a day counts only with every task
  // in it, so a missed or half-done day breaks the run); the eras seen
  // through to the end; and friends.
  const bestRun = Math.max(
    0,
    ...runs.map((run) => {
      const full = new Set(
        run.posted.filter((day) => (run.dayOf(day)?.done ?? 0) >= run.taskCount && run.taskCount > 0),
      );
      let best = 0;
      for (const day of full) {
        // Counted forward from the first day of each stretch only.
        if (full.has(day - 1)) continue;
        let length = 1;
        while (full.has(day + length)) length += 1;
        best = Math.max(best, length);
      }
      return best;
    }),
  );
  const erasFinished = pastRuns.filter((run) => run.status === 'finished').length;
  const stats = [
    { value: `${bestRun}-day`, label: 'best run' },
    { value: String(erasFinished), label: erasFinished === 1 ? 'era finished' : 'eras finished' },
    {
      value: friendCount === undefined ? '–' : String(friendCount),
      label: friendCount === 1 ? 'friend' : 'friends',
    },
  ];

  // Your own page with no era now and none behind it: a fresh account.
  const fresh = !challenge && groups.length === 0 && pastRuns.length === 0 && nextEra !== undefined;

  // The run card counts a day's photos rather than holding them.
  const runDay = useCallback((day: number): RunDay | null => {
    const record = dayOf(day);
    return record ? { done: record.done, shots: record.shots.length } : null;
  }, [dayOf]);

  const runLabel =
    currentDay < 1 ? `${totalDays} days · starts ${shortDate(startDate)}` : `Day ${currentDay} of ${totalDays}`;

  return (
    <View style={style}>
      <View style={styles.identity}>
        <View
          style={styles.ringWrap}
          accessibilityLabel={
            challenge ? `${runLabel}, ${doneToday} of ${taskCount} tasks done today` : undefined
          }
        >
          {/* Counted, not matched to a task: the ring says how many are
              done, filling from the top, whichever ones they were. Done
              segments wear the profile's own warm accent; open ones take
              the empty-day grey the story ring uses.

              The sweep is laid once around the whole ring and shown
              through the done segments as a mask, so a segment's colour
              is simply where it sits on the circle — the first one
              peach, the last one lavender, whichever tasks are done.

              With no era there is no day to gauge: the photo alone, in the
              same box, so the name under it doesn't move. */}
          {challenge ? (
            <Svg width={RING_SIZE} height={RING_SIZE} style={styles.ringSvg}>
              <Defs>
                {/* White is what a mask lets through — the done segments'
                    shape, not a colour anyone sees. */}
                <Mask
                  id="ringDone"
                  maskUnits="userSpaceOnUse"
                  x={0}
                  y={0}
                  width={RING_SIZE}
                  height={RING_SIZE}
                >
                  {ringSegments(taskCount)
                    .slice(0, doneToday)
                    .map((segment, index) =>
                      ringSegment(segment, index, svgColors.onMedia, taskCount > 1),
                    )}
                </Mask>
              </Defs>
  
              {ringSegments(taskCount).map((segment, index) =>
                index < doneToday
                  ? null
                  : ringSegment(segment, index, svgColors.inkGhost, taskCount > 1),
              )}
              <G mask="url(#ringDone)">
                {ringSweep.map((slice, index) => (
                  <Circle
                    key={index}
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RING_RADIUS}
                    stroke={slice.color}
                    strokeWidth={RING_STROKE}
                    fill="none"
                    strokeDasharray={`${RING_CIRCUMFERENCE / RING_SWEEP_SLICES + RING_SWEEP_OVERLAP} ${RING_CIRCUMFERENCE}`}
                    transform={`rotate(${slice.rotation} ${RING_SIZE / 2} ${RING_SIZE / 2})`}
                  />
                ))}
              </G>
            </Svg>
          ) : null}

          {/* The disc behind the photo is the avatar's own shape, so the
              hard shadow has something solid to cast from. A tap plays
              today's story — the ring around it is that story's progress —
              and does nothing on a day with no photo yet. */}
          <View style={[styles.avatarDisc, shadows.hard]}>
            <Pressable
              accessibilityRole={onPlayStory ? 'button' : undefined}
              accessibilityLabel={onPlayStory ? "Watch today's story" : 'Profile photo'}
              disabled={!onPlayStory}
              onPress={onPlayStory}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Avatar source={avatar} size={avatarSize} />
            </Pressable>
          </View>
        </View>

        {/* Stacked under the photo and centred on it. A missing bio is
            simply left out rather than standing in as placeholder text. */}
        <View style={styles.identityText}>
          <Text variant="pageTitle" center>
            {name}
          </Text>
          {bio ? (
            <Text variant="copy" color={colors.inkMuted} center>
              {bio}
            </Text>
          ) : null}

          {/* One line under the bio, read like a sentence: each count in ink
              and bold, its word muted after it, a faint upright rule
              between them — lighter than a dot, which reads as punctuation. */}
          <View style={styles.stats}>
            {stats.map((stat, index) => (
              <Fragment key={stat.label}>
                {index > 0 ? <View style={styles.statRule} /> : null}
                <Text variant="copy" color={colors.inkMuted}>
                  <Text variant="copyBold">{stat.value}</Text> {stat.label}
                </Text>
              </Fragment>
            ))}
          </View>
        </View>
      </View>

      {actions?.length ? (
        <View style={styles.actions}>
          {actions.map((action) => (
            <View key={action.label} style={styles.action}>
              <Pill
                label={action.label}
                tone="muted"
                grey
                labelVariant="copyBold"
                onPress={action.onPress}
                style={styles.actionPill}
              />
            </View>
          ))}
        </View>
      ) : null}


      {/* The era on, as the whole run — a square a day — the same white card
          that closes the Tasks tab, so the run reads the same in both places.
          Here it is also the way into the era's page. */}
      {challenge ? (
        <Pressable
          accessibilityRole="button"
          accessibilityHint="Opens the era"
          onPress={() => router.push({ pathname: '/feed/[id]', params: { id: challenge.id } })}
          style={({ pressed }) => [styles.run, pressed && styles.pressed]}
        >
          <ChallengeRun
            challenge={challenge}
            startDate={startDate}
            currentDay={currentDay}
            totalDays={totalDays}
            taskCount={taskCount}
            dayOf={runDay}
            tone="quiet"
            lives={lives}
            chevron
          />
        </Pressable>
      ) : nextEra && !fresh ? (
        // Between eras the run's place asks you into the next one: the
        // same white card, with a fan of prints from eras you can join.
        <View style={[styles.run, styles.nextEra]}>
          <View style={styles.prints} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {nextEra.photos.slice(0, PRINT_TILTS.length).map((photo, i) => (
              <View
                key={i}
                style={[
                  styles.print,
                  shadows.soft,
                  i > 0 && styles.printOverlap,
                  { transform: [{ rotate: `${PRINT_TILTS[i]}deg` }] },
                ]}
              >
                <Image source={photo} style={styles.printPhoto} contentFit="cover" />
              </View>
            ))}
          </View>
          <View style={styles.nextEraText}>
            <Text variant="copyBold">Ready for a new era?</Text>
            <Text variant="meta" color={colors.inkMuted}>
              {nextEra.hint}
            </Text>
            <Pill label="Find an era" tone="solid" onPress={nextEra.onFind} style={styles.nextEraButton} />
          </View>
        </View>
      ) : null}

      {fresh ? (
        // Your own page before your first era: no card, no heading over an
        // empty list — just what the page will hold, and the way to start.
        <EmptyState
          icon="camera-outline"
          title="Your days will live here"
          hint="Join an era and every day you finish lands on your profile for good."
          hintAsCopy
          action={{ label: 'Start new era', onPress: () => nextEra?.onFind() }}
          style={styles.fresh}
        />
      ) : (
        <Text variant="sectionHeading" accessibilityRole="header" style={styles.daysTitle}>
          {daysTitle}
        </Text>
      )}

      {fresh ? null : groups.length === 0 ? (
        <EmptyState icon="camera-outline" title="No days yet" hint={emptyHint} />
      ) : (
        // Every era down the page, the one on now first, then each behind
        // it: a header row naming it, then its days as one wall of photos
        // out to the screen's edges, the way a photo library lays them.
        groups.map((group) => (
          <View key={group.key} style={styles.era}>
            {/* The whole row is the way on to the era's own feed, opened
                on its latest day — the chevron at its end says so. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${group.name}${group.badge ? `, ${group.badge}` : ''}, ${group.detail}`}
              accessibilityHint={`Opens ${group.name}'s days`}
              onPress={group.posts[0].open}
              style={({ pressed }) => [styles.eraHead, pressed && styles.pressed]}
            >
              <View style={styles.eraHeadName}>
                <Text variant="itemTitle" accessibilityRole="header" numberOfLines={1} style={styles.eraName}>
                  {group.name}
                </Text>
                {/* How a past era ended, in a grey pill — every ending the
                    same quiet grey, whichever way it went. */}
                {group.badge ? (
                  <View style={styles.eraBadge}>
                    <Text variant="badge" color={colors.inkMuted} numberOfLines={1}>
                      {group.badge}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text variant="meta" color={colors.inkMuted} numberOfLines={1}>
                {group.detail}
              </Text>
              <Ionicons name="chevron-forward" size={ERA_CHEVRON} color={colors.inkMuted} />
            </Pressable>

            <View style={styles.postGrid}>
              {group.posts.slice(0, PREVIEW_DAYS).map((post) => {
                const finished = post.done === post.taskCount;
                return (
                  <View key={post.key} style={styles.postCellWrap}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        finished
                          ? `${group.name}, Day ${post.day}, finished`
                          : `${group.name}, Day ${post.day}, ${post.done} of ${post.taskCount} tasks`
                      }
                      onPress={post.open}
                      style={({ pressed }) => [styles.postTile, pressed && styles.pressed]}
                    >
                      {/* The day's cover, as on its post: every photo of it
                          in the seamless mosaic, with "Day N/75" and the
                          era's name across the middle. */}
                      <DayCover
                        cells={post.rows}
                        day={post.day}
                        totalDays={post.totalDays}
                        kicker={group.name}
                        ratio={1 / POST_RATIO}
                      />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        ))
      )}
    </View>
  );
}

export interface ProfileHeaderProps extends Omit<ScreenHeaderProps, 'plainTitle'> {
  /** The profile's handle, with its @. Left out while the person is still
   * loading. */
  handle?: string;
}

/**
 * The bar over a `ProfileView`: the username as the title — the one place
 * a profile shows it, bare, as the bar's title — and whatever corner buttons the screen
 * brings. Yours and anyone else's profile both set their bar through this,
 * so the two titles can't drift apart.
 */
export function ProfileHeader({ handle, ...rest }: ProfileHeaderProps) {
  return <ScreenHeader plainTitle={handle?.replace(/^@/, '') || 'Profile'} {...rest} />;
}

const styles = StyleSheet.create({
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
  avatarDisc: {
    position: 'absolute',
    top: AVATAR_INSET,
    left: AVATAR_INSET,
    width: avatarSize,
    height: avatarSize,
    borderRadius: avatarSize / 2,
    backgroundColor: colors.backgroundPlain,
  },
  identityText: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: layout.block,
  },
  // The bio sits straight under the name, on the lines' own leading; the
  // counts stand a little apart from the two of them.
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: layout.inline,
    marginTop: layout.heading,
  },
  statRule: {
    width: StyleSheet.hairlineWidth * 2,
    height: STAT_RULE,
    backgroundColor: colors.inkGhost,
  },
  // Two equal buttons side by side, a stack's gap apart.
  actions: {
    flexDirection: 'row',
    gap: layout.stack,
    marginTop: layout.block,
  },
  action: {
    flex: 1,
  },
  // The palette's fill grey rather than the pill's warmer muted tone, and
  // stretched across its half of the row.
  actionPill: {
    alignSelf: 'stretch',
    backgroundColor: colors.surfaceSunken,
  },
  run: {
    marginTop: layout.section,
  },
  // The run card's own look — white, lifted, the system list's corner — so
  // between eras the same card holds the same place.
  nextEra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.block,
    padding: layout.card,
    // More air over and under than a row's padding: the tilted prints
    // need room to lean without crowding the card's edge.
    paddingVertical: layout.section + layout.line,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  // A hair of room on the left for the first print's tilt.
  prints: {
    flexDirection: 'row',
    paddingLeft: layout.line,
  },
  // A photo print: a white border round it — white in dark mode too, like
  // a real print's edge — and the card's fill behind while the photo loads.
  print: {
    width: PRINT_WIDTH,
    height: PRINT_HEIGHT,
    borderRadius: radii.md,
    borderWidth: PRINT_BORDER,
    borderColor: colors.onMedia,
    backgroundColor: colors.onMedia,
  },
  printOverlap: {
    marginLeft: -PRINT_OVERLAP,
  },
  printPhoto: {
    flex: 1,
    borderRadius: radii.md - PRINT_BORDER,
  },
  nextEraText: {
    flex: 1,
    alignItems: 'flex-start',
    gap: layout.line / 2,
  },
  nextEraButton: {
    marginTop: layout.heading,
  },
  // A big block's gap between one era and the next.
  era: {
    marginBottom: layout.section,
  },
  // The name and its ending on the left, the count and chevron at the end.
  eraHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.line,
    marginBottom: layout.heading,
  },
  eraHeadName: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.stack,
  },
  // A long name gives way before the badge does.
  eraName: {
    flexShrink: 1,
  },
  eraBadge: {
    paddingVertical: layout.line,
    paddingHorizontal: layout.pill,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceSunken,
  },
  // A big block's gap under the buttons, as the era card would have.
  fresh: {
    marginTop: layout.section,
  },
  // A big block's gap above the heading, a heading's gap under it.
  daysTitle: {
    marginTop: layout.section,
    marginBottom: layout.heading,
  },
  // Within the page's margins, lined up with the header row and the cards
  // above: the outer tiles' half-seams are pulled back so their edges meet
  // the margin.
  postGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -PHOTO_GRID_SEAM / 2,
  },
  // Half the seam on each side of every tile, so two neighbours add up to a
  // whole one between them.
  postCellWrap: {
    width: '33.333%',
    padding: PHOTO_GRID_SEAM / 2,
  },
  // The post's own upright shape, as it shows on Community. Unrounded, like
  // a photo in the library.
  postTile: {
    aspectRatio: POST_RATIO,
    overflow: 'hidden',
    backgroundColor: colors.surfaceSunken,
  },
});

export default ProfileView;
