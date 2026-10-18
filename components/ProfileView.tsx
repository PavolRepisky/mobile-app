import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  useColorScheme,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
  type ColorValue,
} from 'react-native';
import Svg, { Circle, Defs, G, Mask } from 'react-native-svg';

import { colors, colorsFor, layout, radii, shadows } from '@/constants/theme';
import { addDays, shortDate } from '@/lib/format';
import { Avatar, type AvatarSource } from './Avatar';
import { Card } from './Card';
import { ChallengeRun, type RunDay } from './ChallengeRun';
import { EmptyState } from './EmptyState';
import { DayStamp } from './FriendCard';
import { MosaicArrangement } from './PhotoCollage';
import { Pill } from './Pill';
import { Placeholder } from './Placeholder';
import { accentAt } from './TaskRing';
import { Text } from './Text';

/** Kept out of the stylesheet because it is handed to `Image` as often as to
 * a `View`, and the two disagree about what a style is allowed to say —
 * the calendar's own day-cell mosaic does the same. */
const DAY_CELL_PIECE = { flex: 1 } as const;
/** No cut between a day's own photos — unlike the calendar's own mosaic,
 * the gap here belongs between whole day tiles, not the prints inside one. */
const DAY_CELL_SEAM = 0;
/** The seam between day tiles: the theme's gap between tiles in a grid —
 * enough page between them that each day reads as its own post, still close
 * enough that an era reads as one wall of pictures. */
const PHOTO_GRID_SEAM = layout.grid;

/** How many of an era's days show before its "All 30 days" link to the
 * era's own feed: three rows for the era on now, two for each one behind it. */
const PREVIEW_NOW = 9;
const PREVIEW_PAST = 6;
/** The marks under the eras' slider saying which one is on show. */
const ERA_DOT = 6;
/** The chevron after the link's words, the size of their lowercase. */
const MORE_CHEVRON = 13;

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
  handle: string;
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
  /** A row of buttons under the bio — on someone else's page, where you
   * stand with them and Share. One without `onPress` is a status, not a
   * button — "Friends". */
  actions?: readonly { label: string; onPress?: () => void }[];
  style?: StyleProp<ViewStyle>;
}

/**
 * A profile's whole page under its header — the photo in its task ring,
 * name, handle and bio, the era's name, and the days as one grid — no
 * calendar, and no missed days: the page shows what was done. Your own Profile tab and anyone else's profile are both this, so
 * the two can't drift: only the header differs, where yours carries
 * Settings and theirs the way back.
 */
export function ProfileView({
  avatar,
  name,
  handle,
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
  actions,
  style,
}: ProfileViewProps) {
  // Plain colours for the appearance on show, for the ring's SVG, which
  // takes no adaptive ones.
  const svgColors = colorsFor(useColorScheme());
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  // An era's card: the content width less a peek of the next one.
  // Which era the slider is on, for the dots under it.
  const [eraIndex, setEraIndex] = useState(0);

  // How many of today's tasks are ticked off — what the ring fills in.
  const doneToday = dayOf(currentDay)?.done ?? 0;

  // The days in one group per era — the one on now first, then each earlier
  // one, most recent first — under a header naming it: where it stands now,
  // or its dates and how it ended. Each day is cut into the same merged
  // mosaic the Tasks tab and a post use. Only the tasks that actually got a
  // photo take a slice of the cell: a day with three of five shot reads as
  // three prints, not three prints and two grey gaps. An era with nothing
  // posted yet has no group.
  const runs = [
    ...(challenge
      ? [{
          key: 'now',
          name: challenge.name,
          taskCount,
          dayOf,
          posted,
          onOpenDay,
          detail: currentDay < 1 ? `${totalDays} days` : `Day ${currentDay} of ${totalDays}`,
          badge: null,
        }]
      : []),
    ...pastRuns.map((run) => ({
      ...run,
      detail: `${shortDate(run.startDate)} – ${shortDate(addDays(run.startDate, run.totalDays - 1))}`,
      badge:
        run.status === 'finished'
          ? 'Finished'
          : run.status === 'lost'
            ? `Out of lives on Day ${run.lastDay}`
            : `Left on Day ${run.lastDay}`,
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
              rows: record.shots,
              done: record.done,
              open: () => run.onOpenDay(day),
            }]
          : [];
      });
      return {
        key: run.key,
        name: run.name,
        detail: `${run.detail} · ${posts.length} posted`,
        preview: run.key === 'now' ? PREVIEW_NOW : PREVIEW_PAST,
        badge: run.badge,
        posts,
      };
    })
    .filter((group) => group.posts.length > 0);
  const postedCount = groups.reduce((sum, group) => sum + group.posts.length, 0);

  // The profile in three counts: every day in the grid, across all eras;
  // the eras seen through to the end; and friends.
  const erasFinished = pastRuns.filter((run) => run.status === 'finished').length;
  const stats = [
    { value: String(postedCount), label: postedCount === 1 ? 'Day posted' : 'Days posted' },
    { value: String(erasFinished), label: erasFinished === 1 ? 'Era finished' : 'Eras finished' },
    {
      value: friendCount === undefined ? '–' : String(friendCount),
      label: friendCount === 1 ? 'Friend' : 'Friends',
    },
  ];

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
          <Text variant="metaBold" color={colors.inkMuted} center>
            {handle}
          </Text>
          {bio ? (
            <Text variant="copy" color={colors.inkMuted} center style={styles.bio}>
              {bio}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Side by side across the page, each count over its label, a
          hairline between them — read as one line, not three cards. */}
      <View style={styles.stats}>
        {stats.map((stat, index) => (
          <View
            key={stat.label}
            accessible
            accessibilityLabel={`${stat.value} ${stat.label}`}
            style={[styles.stat, index > 0 && styles.statDivided]}
          >
            <Text variant="sectionHeading" center>
              {stat.value}
            </Text>
            <Text variant="meta" color={colors.inkMuted} center>
              {stat.label}
            </Text>
          </View>
        ))}
      </View>

      {actions?.length ? (
        <View style={styles.actions}>
          {actions.map((action) => (
            <View key={action.label} style={styles.action}>
              <Pill
                label={action.label}
                tone="muted"
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
          />
        </Pressable>
      ) : null}

      <Text variant="sectionHeading" accessibilityRole="header" style={styles.daysTitle}>
        {daysTitle}
      </Text>

      {groups.length === 0 ? (
        <EmptyState icon="camera-outline" title="No days yet" hint={emptyHint} />
      ) : (
        // One era to a page, swiped between sideways — the one on now first,
        // then each behind it. The slider runs out to the screen's edges so
        // a page slides off them rather than vanishing at the margin; each
        // page puts the margin back inside itself. Each era is a white card,
        // the same lifted card as the run above it.
        <>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(e) => {
              const next = Math.round(e.nativeEvent.contentOffset.x / windowWidth);
              if (next !== eraIndex) setEraIndex(next);
            }}
            style={styles.eraSlider}
            contentContainerStyle={styles.eraSliderContent}
          >
            {groups.map((group) => (
              <View key={group.key} style={[styles.eraPage, { width: windowWidth }]}>
                <Card>
                  <View style={styles.eraCard}>
                    <View style={styles.eraHead}>
                      <View style={styles.eraHeadText}>
                        <Text variant="itemTitle" accessibilityRole="header" numberOfLines={1}>
                          {group.name}
                        </Text>
                        <Text variant="meta" color={colors.inkMuted} numberOfLines={1}>
                          {group.detail}
                        </Text>
                      </View>
                      {/* How a past era ended, in a grey pill — every ending the
                          same quiet grey, whichever way it went. */}
                      {group.badge ? (
                        <View style={styles.eraBadge}>
                          <Text variant="meta" color={colors.inkMuted}>
                            {group.badge}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.postGrid}>
                      {group.posts.slice(0, group.preview).map((post) => {
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
                              {/* No task count on the tile, finished or not — a day is
                                  its photos, and how many tasks it got is one tap away
                                  on the post. No era name either: the header over the
                                  group already says it. */}
                              <DayStamp day={post.day} referenceWidth={windowWidth} />
                            </Pressable>
                          </View>
                        );
                      })}
                    </View>

                    {/* Every era, long or short, has the way on to its own page —
                        the era's feed, opened on its latest day, the same page a
                        tile opens — so each card ends the same way. */}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityHint={`Opens ${group.name}'s days`}
                      onPress={group.posts[0].open}
                      style={({ pressed }) => [styles.more, pressed && styles.pressed]}
                    >
                      <Text variant="metaBold" color={colors.systemAccent}>
                        See all
                      </Text>
                      <Ionicons name="chevron-forward" size={MORE_CHEVRON} color={colors.systemAccent} />
                    </Pressable>
                  </View>
                </Card>
              </View>
            ))}
          </ScrollView>
          {groups.length > 1 ? (
            <View style={styles.eraDots}>
              {groups.map((group, i) => (
                <View key={group.key} style={[styles.eraDot, i === eraIndex && styles.eraDotActive]} />
              ))}
            </View>
          ) : null}
        </>
      )}
    </View>
  );
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
  bio: {
    marginTop: layout.line,
  },
  stats: {
    flexDirection: 'row',
    marginTop: layout.section,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: layout.line / 2,
  },
  // A hairline down the left of every count after the first.
  statDivided: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.inkGhost,
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
  // Out to the screen's edges, and a block taller than the cards each way so
  // their shadows aren't clipped by the scroller — given back in margin, so
  // the gaps round the slider stay what they were.
  eraSlider: {
    marginHorizontal: -layout.gutter,
    marginVertical: -layout.block,
  },
  // Centred under the grid; the card's own padding is the room under it.
  more: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: layout.line,
    paddingTop: layout.block,
  },
  // Pages keep their own height: a short era doesn't stretch to the
  // tallest one's.
  eraSliderContent: {
    alignItems: 'flex-start',
  },
  eraPage: {
    paddingHorizontal: layout.gutter,
    paddingVertical: layout.block,
  },
  // Padded inside the card's clip rather than on the card itself: on the
  // card, the inner clip shrinks by the padding but keeps the full corner,
  // and cut into the title at the top left.
  eraCard: {
    padding: layout.card,
  },
  eraDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: layout.line + layout.line / 2,
    marginTop: layout.stack,
  },
  eraDot: {
    width: ERA_DOT,
    height: ERA_DOT,
    borderRadius: radii.pill,
    backgroundColor: colors.inkGhost,
  },
  eraDotActive: {
    backgroundColor: colors.ink,
  },
  eraHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.inline,
    marginBottom: layout.heading,
  },
  eraHeadText: {
    flex: 1,
  },
  eraBadge: {
    paddingVertical: layout.line,
    paddingHorizontal: layout.pill,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceSunken,
  },
  // A big block's gap above the heading, a heading's gap under it.
  daysTitle: {
    marginTop: layout.section,
    marginBottom: layout.heading,
  },
  // Within the page's margins, lined up with the heading: the outer tiles'
  // half-seams are pulled back so their edges meet the margin.
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
  // Square, unrounded, like a photo in the library.
  postTile: {
    aspectRatio: 1,
    overflow: 'hidden',
    backgroundColor: colors.surfaceSunken,
  },
});

export default ProfileView;
