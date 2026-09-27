import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Fragment, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import { PhotoStrip } from '@/components/PhotoStrip';
import { PhotoViewer } from '@/components/PhotoViewer';
import { PrimaryButton } from '@/components/Buttons';
import {
  profileActionButton,
  profileActionIcon,
  profileActionTop,
} from '@/components/ProfileLayout';
import { ScreenScroll, topPadding } from '@/components/Screen';
import { DateRange } from '@/components/DateRange';
import { CheckCircle } from '@/components/TaskRow';
import { Text } from '@/components/Text';
import { colors, layout, radii, shadows, spacing, tabBarBottom } from '@/constants/theme';
import { challengeById } from '@/data/challenges';
import { DISCOVER, FRIENDS, PEOPLE, type DiscoverSection } from '@/data/content';
import { useApp } from '@/hooks/useAppState';
import { addDays, longDate } from '@/lib/format';
import { DAY_MS, localDay, roundState } from '@/lib/round';

/** One square of the countdown clock: two digits of `headlineSm` and air. The
 * four share the row's width between them. */
const COUNTDOWN_TILE_HEIGHT = 56;

const SECOND_MS = 1_000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;

/** The disc holding the lock (or the flag, once a round is over). */
const STATUS_ICON_SIZE = 40;

/** Faces in the "who's in" stack, and how far each tucks under the last. */
const FACE_SIZE = 28;
const FACE_OVERLAP = -9;
const FACE_RIM = 2;

/** The ticked circle leading each task row. */
const TASK_CHECK_SIZE = 28;

/** The creator's face, leading the row with their name. */
const CREATOR_AVATAR_SIZE = 40;

/** The still-going row: how many faces it shows before the "+N" circle,
 * their size, and how far each laps over the last. */
const GOING_FACES = 6;
const GOING_FACE_SIZE = 48;
const GOING_FACE_OVERLAP = -12;

/** A finisher's face in an ended round's grid, four to a row, and the
 * arrow badge on its corner that says it opens something. */
const FINISHER_AVATAR_SIZE = 64;
const FINISHER_BADGE_SIZE = 24;

/**
 * A challenge's preview, in one of two shapes. Before its Day 1 it is an
 * invitation: when it starts, who is already in, what it asks of you each
 * day, and Join pinned to the bottom. Once it has started — or finished —
 * joining is closed, so the page shows how the round is going instead and
 * hands the dock to the next round you still can join.
 */
export default function FeedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectChallenge } = useApp();
  const [openPhotoIndex, setOpenPhotoIndex] = useState<number | null>(null);
  // Measured rather than assumed, since the two docks differ in height and
  // the scroll has to clear whichever one is showing.
  const [dockHeight, setDockHeight] = useState(0);

  const section = DISCOVER.find((s) => s.id === String(id)) ?? DISCOVER[0];
  const challenge = challengeById(section.id);
  const creator = PEOPLE.find((p) => p.id === section.creatorId) ?? PEOPLE[0];
  const totalDays = challenge.defaultDays;
  const start = localDay(section.startDate);
  const end = addDays(start, totalDays - 1);
  const state = roundState(start, totalDays);
  // Only a round you can still join has anything to dock at the bottom.
  const hasDock = state.kind === 'upcoming';

  /**
   * The line the title and the back button share — My Profile's corner
   * offset, or the status bar's if that runs lower.
   */
  const headerTop = Math.max(profileActionTop, topPadding(insets.top));
  const titleOffset = headerTop - topPadding(insets.top);

  // The same gap the floating tab bar keeps off the bottom edge, above and
  // below, so the dock reads as that bar filled in rather than a button
  // adrift over a long stretch of safe area.
  const dockGap = tabBarBottom(insets.bottom);

  return (
    // Absolute overlays need a positioned parent, otherwise their offsets
    // resolve against the scroll content instead of the screen.
    <View style={styles.screenRoot}>
      <ScreenScroll bottomExtra={hasDock ? Math.max(0, dockHeight - insets.bottom) : 0}>
        {/* Settings' own title line: centred, the height of the round
            button pinned beside it and dropped to the same line. */}
        <View style={[styles.header, { marginTop: titleOffset }]}>
          <Text variant="pageTitle" center>
            {challenge.name}
          </Text>
        </View>

        <PhotoStrip
          photos={section.photos}
          height={170}
          onPressPhoto={setOpenPhotoIndex}
          layout="scattered"
          framed
          style={styles.strip}
        />

        <View style={styles.body}>
          {/* Whose challenge this is, on every version of the page — a fact
              about it that happens to open their profile, the same pair a
              post's avatar and name open one from. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View ${creator.name}'s profile`}
            onPress={() =>
              router.push({ pathname: '/friend/[id]', params: { id: creator.id } })
            }
            style={({ pressed }) => [styles.creator, pressed && styles.pressed]}
          >
            <Avatar source={creator.avatar} size={CREATOR_AVATAR_SIZE} />
            <View>
              <Text variant="copyBold">{creator.name}</Text>
              <Text variant="meta" color={colors.inkMuted} style={styles.creatorHandle}>
                Created by {creator.handle}
              </Text>
            </View>
          </Pressable>

          {state.kind === 'upcoming' ? (
            <Upcoming section={section} start={start} />
          ) : (
            <Started
              section={section}
              start={start}
              end={end}
              totalDays={totalDays}
              day={state.kind === 'running' ? state.day : null}
              onOpenProfile={(personId) =>
                router.push({ pathname: '/friend/[id]', params: { id: personId } })
              }
            />
          )}
        </View>
      </ScreenScroll>

      {/* My Profile's round corner button — the same size, white disc and
          soft shadow — pinned over the scroll so the way out stays put. */}
      <IconButton
        name="chevron-back"
        size={profileActionButton}
        iconSize={profileActionIcon}
        background={colors.surface}
        onPress={() => router.back()}
        accessibilityLabel="Go back"
        style={[styles.back, { top: headerTop }]}
      />

      {hasDock ? (
        <View
          onLayout={(e) => setDockHeight(e.nativeEvent.layout.height)}
          style={[styles.dock, { paddingTop: layout.block, paddingBottom: dockGap }]}
        >
          <PrimaryButton
            label={`Join · starts ${longDate(start)}`}
            onPress={() => {
              selectChallenge(section.id);
              // Straight onto the day's tasks — joining is the whole step,
              // with no editor to pass through on the way.
              router.dismissTo('/(tabs)/tasks');
            }}
          />
          <Text variant="meta" color={colors.inkMuted} center>
            {totalDays} days · finishes {longDate(end)}
          </Text>
        </View>
      ) : null}

      <PhotoViewer
        photos={section.photos}
        index={openPhotoIndex}
        onDismiss={() => setOpenPhotoIndex(null)}
      />
    </View>
  );
}

/**
 * The body before Day 1: when it starts, who is in, what it is about, and the
 * tasks it asks for each day.
 */
function Upcoming({ section, start }: { section: DiscoverSection; start: Date }) {
  const challenge = challengeById(section.id);
  // Friends stand in for whoever has joined so far, the way the browse
  // cards' own face stacks do.
  const faces = FRIENDS.slice(0, 3);
  const named = faces
    .slice(0, 2)
    .map((f) => f.name)
    .join(', ');

  return (
    <>
      <View style={styles.countdownBlock}>
        <Text variant="sectionHeading">Starts in</Text>
        <Countdown to={start} />
      </View>

      <View style={styles.whoRow}>
        <View style={styles.faces}>
          {faces.map((friend, i) => (
            <Avatar
              key={friend.id}
              source={friend.avatar}
              size={FACE_SIZE}
              style={[styles.face, i > 0 && styles.faceOverlap]}
            />
          ))}
        </View>
        <Text variant="meta" color={colors.inkMuted} style={styles.whoText}>
          <Text variant="metaBold">{named}</Text> and{' '}
          {section.members.toLocaleString('en-US')} are in
        </Text>
      </View>

      <Text variant="copy" color={colors.inkMuted}>
        {challenge.description}
      </Text>

      {/* Ticked rather than hollow: nothing here is the reader's to tick
          yet, so a filled circle reads as "what's included" instead of an
          empty checklist waiting on them. */}
      <Card padded={false} style={styles.tasks}>
        {challenge.tasks.map((task) => (
          <View key={task.id} style={styles.taskRow}>
            <CheckCircle checked size={TASK_CHECK_SIZE} />
            <Text variant="itemTitle" style={styles.taskLabel}>
              {task.label}
            </Text>
          </View>
        ))}
      </Card>
    </>
  );
}

/**
 * The body once Day 1 has passed: where the round is and that joining has
 * closed, then how many are still in it — or, once it is over, the faces of
 * everyone who made it to the end.
 */
function Started({
  section,
  start,
  end,
  totalDays,
  day,
  onOpenProfile,
}: {
  section: DiscoverSection;
  start: Date;
  end: Date;
  totalDays: number;
  /** Today's day of the round, or null once it has finished. */
  day: number | null;
  /** A finisher's profile, from an ended round's faces. */
  onOpenProfile: (id: string) => void;
}) {
  const members = section.members.toLocaleString('en-US');
  const goingFaces = PEOPLE.slice(0, GOING_FACES);
  const goingRest = (section.stillGoing ?? 0) - goingFaces.length;
  return (
    <>
      <View style={styles.statusCard}>
        <View style={styles.statusIcon}>
          <Ionicons name={day ? 'lock-closed' : 'flag'} size={18} color={colors.ink} />
        </View>
        <View style={styles.statusText}>
          <Text variant="itemTitle">
            {day
              ? `Day ${day} of ${totalDays} · joining closed`
              : `Finished · all ${totalDays} days`}
          </Text>
          <DateRange
            from={longDate(start)}
            to={longDate(end)}
            variant="meta"
            color={colors.inkMuted}
          />
          <Text variant="meta" color={colors.inkMuted}>
            {members} members
          </Text>
        </View>
      </View>

      {day === null ? (
        // Once the round is over the people matter more than their last
        // photo, so it is faces — each one opening that person's profile.
        <View style={styles.finishersBlock}>
          <View style={styles.finishersHeading}>
            <Text variant="sectionHeading">Made it to Day {totalDays}</Text>
            <Text variant="metaBold" color={colors.inkMuted}>
              {PEOPLE.length}
            </Text>
          </View>
          <View style={styles.finisherFaces}>
            {PEOPLE.map((person) => (
              <Pressable
                key={person.id}
                accessibilityRole="button"
                accessibilityLabel={`View ${person.name}'s profile`}
                onPress={() => onOpenProfile(person.id)}
                style={({ pressed }) => [styles.finisherFace, pressed && styles.pressed]}
              >
                <View>
                  <Avatar source={person.avatar} size={FINISHER_AVATAR_SIZE} />
                  {/* A face on its own reads as a picture; the arrow is what
                      says it goes somewhere, the way the round buttons do. */}
                  <View style={styles.finisherBadge}>
                    <Ionicons name="arrow-forward" size={14} color={colors.ink} />
                  </View>
                </View>
                <Text variant="meta" numberOfLines={1}>
                  {person.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : section.stillGoing !== undefined ? (
        // While it runs, the people still in it rather than a figure about
        // them: a row of faces ending in how many more there are, the way the
        // who's-in row before Day 1 reads, only bigger.
        <View style={styles.finishersBlock}>
          <View style={styles.finishersHeading}>
            <Text variant="sectionHeading">Still going</Text>
            <Text variant="metaBold" color={colors.inkMuted}>
              {section.stillGoing.toLocaleString('en-US')} of {members}
            </Text>
          </View>
          <View style={styles.goingRow}>
            {goingFaces.map((person, i) => (
              <Avatar
                key={person.id}
                source={person.avatar}
                size={GOING_FACE_SIZE}
                style={[styles.goingFace, i > 0 && styles.goingFaceOverlap]}
              />
            ))}
            {goingRest > 0 ? (
              <View style={[styles.goingFace, styles.goingFaceOverlap, styles.goingMore]}>
                <Text variant="metaBold">+{goingRest.toLocaleString('en-US')}</Text>
              </View>
            ) : null}
          </View>
          <Text variant="meta" color={colors.inkMuted}>
            {(section.members - section.stillGoing).toLocaleString('en-US')} have dropped
            out since Day 1
          </Text>
        </View>
      ) : null}
    </>
  );
}

/**
 * Days, hours, minutes and seconds to Day 1, read as a clock: a grey square
 * per unit, two digits each so the squares hold still as they count down,
 * the units named underneath and faint colons between. The seconds are what
 * make it read as a clock running rather than a date, so it ticks every
 * second.
 */
function Countdown({ to }: { to: Date }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), SECOND_MS);
    return () => clearInterval(id);
  }, []);

  const left = Math.max(0, to.getTime() - now);
  const units = [
    { value: Math.floor(left / DAY_MS), label: 'days' },
    { value: Math.floor((left % DAY_MS) / HOUR_MS), label: 'hours' },
    { value: Math.floor((left % HOUR_MS) / MINUTE_MS), label: 'min' },
    { value: Math.floor((left % MINUTE_MS) / SECOND_MS), label: 'sec' },
  ];

  return (
    <View
      accessible
      accessibilityLabel={`Starts in ${units.map((u) => `${u.value} ${u.label}`).join(', ')}`}
      style={styles.countdown}
    >
      {units.map((unit, i) => (
        <Fragment key={unit.label}>
          {i > 0 ? (
            <View style={styles.countdownColon}>
              <Text variant="headlineSm" color={colors.inkGhost}>
                :
              </Text>
            </View>
          ) : null}
          <View style={styles.countdownUnit}>
            <View style={styles.countdownTile}>
              <Text variant="headlineSm">{String(unit.value).padStart(2, '0')}</Text>
            </View>
            <Text variant="meta" color={colors.inkMuted}>
              {unit.label}
            </Text>
          </View>
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: colors.backgroundPlain,
  },
  back: {
    position: 'absolute',
    left: layout.gutter,
  },
  // The pinned button's height, so the title centres on its line. Inset by
  // the button and a row's gap on both sides, so a long name wraps before it
  // runs under the button — and stays centred on the page while it does.
  header: {
    minHeight: profileActionButton,
    justifyContent: 'center',
    paddingHorizontal: profileActionButton + layout.inline,
    marginBottom: layout.title,
  },
  strip: {
    marginBottom: layout.section,
  },
  body: {
    gap: layout.block,
  },
  // Only as wide as its contents, so the tap lands on the person and not on
  // the empty width of the page beside them.
  // Pulled up into the name's leading: the two lines are one caption, and
  // the gap their line heights leave on their own splits them apart.
  creatorHandle: {
    marginTop: -spacing.xs,
  },
  creator: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: layout.inline,
  },
  countdownBlock: {
    gap: layout.heading,
  },
  countdown: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: layout.stack,
  },
  countdownUnit: {
    flex: 1,
    alignItems: 'center',
    gap: layout.stack,
  },
  countdownTile: {
    alignSelf: 'stretch',
    height: COUNTDOWN_TILE_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSunken,
  },
  // Centred on the squares rather than on the square-plus-label column.
  countdownColon: {
    height: COUNTDOWN_TILE_HEIGHT,
    justifyContent: 'center',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.inline,
    padding: layout.card,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceSunken,
  },
  statusText: {
    flex: 1,
    gap: layout.line,
  },
  statusIcon: {
    width: STATUS_ICON_SIZE,
    height: STATUS_ICON_SIZE,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.inline,
  },
  faces: {
    flexDirection: 'row',
  },
  face: {
    borderWidth: FACE_RIM,
    borderColor: colors.surface,
  },
  faceOverlap: {
    marginLeft: FACE_OVERLAP,
  },
  whoText: {
    flex: 1,
  },
  tasks: {
    paddingVertical: layout.stack,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.inline,
    paddingVertical: layout.heading,
    paddingHorizontal: layout.card,
  },
  taskLabel: {
    flex: 1,
  },
  // A section's room above, since this is a new block rather than another
  // fact about the round.
  finishersBlock: {
    marginTop: layout.section - layout.block,
    gap: layout.heading,
  },
  finishersHeading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  goingRow: {
    flexDirection: 'row',
  },
  // White-rimmed so each face stays whole where the next one laps over it.
  goingFace: {
    width: GOING_FACE_SIZE,
    height: GOING_FACE_SIZE,
    borderRadius: radii.pill,
    borderWidth: FACE_RIM,
    borderColor: colors.surface,
  },
  goingFaceOverlap: {
    marginLeft: GOING_FACE_OVERLAP,
  },
  // The count takes a face's place at the end of the row, in the fill grey.
  goingMore: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSunken,
  },
  finisherFaces: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: layout.block,
  },
  // A quarter of the row each, so the faces land in even columns however
  // many there are.
  finisherFace: {
    width: '25%',
    alignItems: 'center',
    gap: layout.stack,
  },
  // The round buttons' white disc and soft shadow, tucked on the face's
  // corner.
  finisherBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: FINISHER_BADGE_SIZE,
    height: FINISHER_BADGE_SIZE,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  },
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: layout.stack,
    paddingHorizontal: layout.gutter,
    backgroundColor: colors.surface,
    ...shadows.floating,
  },
  pressed: {
    opacity: 0.85,
  },
});
