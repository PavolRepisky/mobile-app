import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, type AvatarSource } from '@/components/Avatar';
import { CheckCircle } from '@/components/CheckCircle';
import { IconButton, cornerButtonSize, cornerIconSize } from '@/components/IconButton';
import { PhotoViewer } from '@/components/PhotoViewer';
import { Pill } from '@/components/Pill';
import { PrimaryButton } from '@/components/Buttons';
import { headerLineTop, ScreenScroll, topPadding } from '@/components/Screen';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { Text } from '@/components/Text';
import {
  absoluteFill,
  colors,
  gradients,
  layout,
  radii,
  shadows,
  spacing,
  tabBarBottom,
} from '@/constants/theme';
import { challengeById } from '@/data/challenges';
import {
  DISCOVER,
  FRIENDS,
  ME,
  PEOPLE,
  type DiscoverSection,
  type Standing,
  type StreakGroup,
} from '@/data/content';
import { LIVES_PER_CHALLENGE, useApp } from '@/hooks/useAppState';
import { addDays, longDate, ordinal, shortDate } from '@/lib/format';
import { DAY_MS, localDay, roundState } from '@/lib/round';

const SECOND_MS = 1_000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;

/** The photos across the top: one tall beside two stacked, edge to edge and
 * butted together with no seam, so the three read as one picture. As tall as
 * the design draws them. */
const HERO_HEIGHT = 380;

/** The creator's face in the caption laid over the photos. */
const HERO_AVATAR_SIZE = 24;

/** The row of hearts on the lives card. */
const HEART_SIZE = 22;

/** The white disc holding each How it works row's icon, and the rule between
 * rows: white, a pixel, so the grey card reads as one block with seams. */
const TERM_ICON_SIZE = 36;
const TERM_RULE = 1;

/** The circle leading each task — hollow while it's open, the tick once
 * today's photo is in — in the ring weight of the create form's focus ring. */
const TASK_CIRCLE_SIZE = 22;
const TASK_CIRCLE_RULE = 2;

/** Faces in the "who's in" stack, and how far each tucks under the last. */
const WHO_FACES = 4;
const WHO_FACE_SIZE = 30;
const FACE_OVERLAP = -9;
const FACE_RIM = 2;

/** "Lose all three": the lives spelled out, up to the most a round offers. */
const COUNT_WORDS = ['no', 'one', 'two', 'three', 'four', 'five'];

/** The podium's faces: the middle spot's a size up from its neighbours,
 * lapped by about a third, with at most two faces before the "+N". White
 * rimmed so each stays whole where the next laps over it. */
const PODIUM_FACE = 48;
const PODIUM_FACE_TOP = 56;
const PODIUM_OVERLAP = -16;
const PODIUM_OVERLAP_TOP = -20;
const PODIUM_FACES = 2;
const PODIUM_RIM = 3;

/** The podium's steps, first to third — far enough apart that the order
 * reads before the numbers do. */
const STEP_HEIGHTS = [108, 74, 56];

/** The little tags on the podium — "No misses", "You're here" — a
 * size under the smallest pill, so they label a spot without competing with
 * the faces. */
const TAG_HEIGHT = 22;

/** The finishers' faces heading the results: smaller than the podium's so
 * the podium still reads as the main event, lapped the same way. */
const FINISHER_FACE = 40;
const FINISHER_OVERLAP = -12;
const FINISHER_FACES = 6;

/** A row of the standings, its face, and the rank column in front, wide
 * enough for two digits so the faces line up. */
const STANDING_ROW = 56;
const STANDING_FACE = 40;
const RANK_WIDTH = 20;

/** How many of those who ran out of lives show before See all. */
const RAN_OUT_PREVIEW = 3;

/** Your face on the Your run card, rimmed in white to lift it off the ink. */
const RUN_FACE = 48;
const RUN_RIM = 2;

/**
 * A challenge's page. Before Day 1 and while it runs it is one page — the
 * photos, the round's terms, what it asks each day, the lives rule and who's
 * in it, with one action docked at the bottom — told from where you stand:
 * invited, joined and waiting, in it today, or watching a round you can no
 * longer join. A round that is over gets its own page, `Finished`.
 */
export default function FeedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { challenge: mine, startDate, totalDays: myDays } = useApp();

  const section = DISCOVER.find((s) => s.id === String(id)) ?? DISCOVER[0];
  const challenge = challengeById(section.id);
  // The challenge you've taken on is told by your own round — your Day 1 and
  // length — so its page stands where your Tasks tab does, whatever date the
  // listing gives the round everyone else sees.
  const joined = mine.id === section.id;
  const totalDays = joined ? myDays : challenge.defaultDays;
  const start = joined ? startDate : localDay(section.startDate);
  const end = addDays(start, totalDays - 1);
  const state = roundState(start, totalDays);

  if (state.kind === 'ended') {
    return (
      <Finished
        section={section}
        start={start}
        end={end}
        results={section.results ?? { finished: 0, groups: [] }}
      />
    );
  }

  const page = { section, start, end, totalDays };
  if (state.kind === 'upcoming') {
    return <ChallengePage {...page} mode={joined ? 'waiting' : 'preview'} day={null} />;
  }
  return <ChallengePage {...page} mode={joined ? 'active' : 'closed'} day={state.day} />;
}

/**
 * Where you stand with a round: `preview` — it hasn't started and you could
 * join; `waiting` — you've joined and Day 1 is still to come; `active` —
 * it's under way and you're in it; `closed` — it's under way without you.
 */
type PageMode = 'preview' | 'waiting' | 'active' | 'closed';

/**
 * The page itself, the same in every mode: the photos edge to edge with the
 * name, where the round stands and whose it is laid over them; then How it
 * works with a clock to the moment that matters now, the description, the
 * daily tasks, the lives rule and who's in it. What changes with the mode is
 * the words, the clock's target, today's ticks once you're in, and the one
 * action docked at the bottom.
 */
function ChallengePage({
  section,
  start,
  end,
  totalDays,
  mode,
  day,
}: {
  section: DiscoverSection;
  start: Date;
  end: Date;
  totalDays: number;
  mode: PageMode;
  /** Today's day of the round once it has started. */
  day: number | null;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, progress, tasks, currentDay, livesLeft } = useApp();
  const [openPhotoIndex, setOpenPhotoIndex] = useState<number | null>(null);
  // Measured rather than assumed, so the scroll clears the dock's two lines
  // whatever they wrap to.
  const [dockHeight, setDockHeight] = useState(0);
  const [today] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });

  const challenge = challengeById(section.id);
  const lives = challenge.lives ?? LIVES_PER_CHALLENGE;
  const inIt = mode === 'waiting' || mode === 'active';
  const going = mode === 'active' || mode === 'closed';

  // Today's ticks, only once you're in a round that has started, read in the
  // challenge's own list order, the way the page lists the tasks.
  const todays = mode === 'active' ? progress[currentDay] : undefined;
  const doneToday = challenge.tasks.filter((task) => todays?.[task.id]?.done).length;
  // Days in a row with every task shot, counted back from yesterday, and
  // today too once it's complete.
  const streak = (() => {
    if (mode !== 'active') return 0;
    const complete = (d: number) => tasks.every((task) => progress[d]?.[task.id]?.done);
    let run = 0;
    for (let d = currentDay - 1; d >= 1 && complete(d); d -= 1) run += 1;
    return complete(currentDay) ? run + 1 : run;
  })();

  const daysToGo = Math.round((start.getTime() - today.getTime()) / DAY_MS);
  const startsIn = daysToGo <= 1 ? 'Starts tomorrow' : `Starts in ${daysToGo} days`;
  // Every stage's badge leads with a mark: the calendar before Day 1, the
  // tick once you're in, the hourglass while it runs (the browse lists'
  // own "under way"), the lock once joining has closed.
  const badge: { label: string; icon: keyof typeof Ionicons.glyphMap } = {
    preview: { label: `${startsIn} · ${longDate(start)}`, icon: 'calendar-outline' as const },
    waiting: { label: `You're in · starts ${longDate(start)}`, icon: 'checkmark' as const },
    active: { label: `Day ${day} of ${totalDays} · you're in`, icon: 'hourglass-outline' as const },
    closed: { label: `Day ${day} of ${totalDays} · closed to join`, icon: 'lock-closed' as const },
  }[mode];

  // The clock counts to whatever is next: Day 1 before the start, midnight
  // while today's tasks are yours to shoot, the last midnight while you watch.
  const toDayOne = {
    label: 'Starts in',
    to: start,
    hint: `${longDate(start)} — everyone starts together`,
  };
  const clock = {
    preview: toDayOne,
    waiting: toDayOne,
    active: {
      label: 'Today ends in',
      to: addDays(today, 1),
      hint: `${doneToday} of ${challenge.tasks.length} done today`,
    },
    closed: { label: 'Ends in', to: addDays(end, 1), hint: `Day ${day} of ${totalDays}` },
  }[mode];

  // Friends stand in for whoever else is in, the way the browse cards' own
  // face stacks do — `PEOPLE` leads with them — and the names are theirs;
  // once you're in, you lead.
  const friends = FRIENDS.slice(0, 2);
  const faces: AvatarSource[] = [
    ...(inIt ? [profile.avatar ?? profile.avatarSeed] : []),
    ...PEOPLE.slice(0, WHO_FACES - (inIt ? 1 : 0)).map((p) => p.avatar),
  ];
  const named = [...(inIt ? ['You'] : []), ...friends.map((f) => f.name)];
  const inCount = going ? (section.stillGoing ?? section.members) : section.members;
  const others = inCount - friends.length - (inIt && going ? 1 : 0);
  const members = section.members.toLocaleString('en-US');

  // The same gap the floating tab bar keeps off the bottom edge, so the dock
  // reads as that bar filled in rather than a button adrift over a long
  // stretch of safe area.
  const dockGap = tabBarBottom(insets.bottom);
  const toTasks = () => router.navigate('/(tabs)/tasks');

  return (
    <View style={styles.screenRoot}>
      <ScreenScroll
        padded={false}
        contentContainerStyle={styles.previewScroll}
        bottomExtra={Math.max(0, dockHeight - insets.bottom)}
      >
        <Hero
          section={section}
          badge={badge.label}
          badgeIcon={badge.icon}
          onOpenPhoto={setOpenPhotoIndex}
        />

        <View style={styles.previewBody}>
          {/* The round's terms as label-and-value rows, the way a Settings
              group reads: each one a fact with what it means under it. */}
          <View style={styles.block}>
            <Text variant="sectionHeading">How it works</Text>
            <View style={styles.terms}>
              <Term
                icon="time-outline"
                label={clock.label}
                value={<Countdown to={clock.to} />}
                hint={clock.hint}
              />
              <Term
                icon="calendar-outline"
                label="Length"
                value={`${totalDays} days`}
                hint={`Ends ${longDate(end)}`}
                ruled
              />
              <Term
                icon="camera-outline"
                label="Every day"
                value={`${challenge.tasks.length} ${challenge.tasks.length === 1 ? 'photo' : 'photos'}`}
                hint="One per task, before midnight"
                ruled
              />
              <Term
                icon="heart-outline"
                label="Lives"
                value={String(lives)}
                hint={
                  lives === 0
                    ? 'One missed day ends your run'
                    : `A ${ordinal(lives + 1)} missed day ends your run`
                }
                ruled
              />
            </View>
          </View>

          <Text variant="copy" color={colors.inkMuted}>
            {challenge.description}
          </Text>

          {/* Once you're in and it's running, the list is today's: a shot
              task ticked, with the time it was taken. */}
          <View style={styles.block}>
            <Text variant="sectionHeading">
              {mode === 'active' ? "Today's tasks" : "Every day you'll"}
            </Text>
            {challenge.tasks.map((task) => {
              const entry = todays?.[task.id];
              return (
                <View key={task.id} style={styles.taskRow}>
                  {entry?.done ? (
                    <CheckCircle size={TASK_CIRCLE_SIZE} style={styles.taskTick} />
                  ) : (
                    <View style={styles.taskCircle} />
                  )}
                  <View style={styles.taskText}>
                    <Text variant="copyBold">{task.label}</Text>
                    {entry?.done ? (
                      <Text variant="meta" color={colors.inkMuted}>
                        {entry.time ? `Done at ${entry.time}` : 'Done'}
                      </Text>
                    ) : task.note ? (
                      <Text variant="meta" color={colors.inkMuted}>
                        {task.note}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>

          {/* The rule that costs people a run, spelled out before they join
              rather than discovered on the day they miss — and once you're
              in, how many of yours are left. */}
          <View style={styles.livesCard}>
            {lives > 0 ? (
              <View style={styles.hearts}>
                {Array.from({ length: lives }, (_, i) => {
                  const kept = mode !== 'active' || i < livesLeft;
                  return (
                    <Ionicons
                      key={i}
                      name={kept ? 'heart' : 'heart-outline'}
                      size={HEART_SIZE}
                      color={kept ? colors.ink : colors.inkGhost}
                    />
                  );
                })}
              </View>
            ) : null}
            <Text variant="itemTitle">
              {mode === 'active'
                ? [
                    lives === 0 ? 'No lives' : `${livesLeft} of ${lives} lives left`,
                    streak > 0 ? `${streak}-day streak` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')
                : lives === 0
                  ? 'No lives'
                  : `You have ${lives} ${lives === 1 ? 'life' : 'lives'}`}
            </Text>
            <Text variant="copy" color={colors.inkMuted}>
              {livesRule(lives)}
            </Text>
          </View>

          <View style={styles.whoBlock}>
            <View style={styles.podiumHeading}>
              <Text variant="sectionHeading">{going ? 'Still going' : "Who's in"}</Text>
              {going ? (
                <Text variant="metaBold" color={colors.inkMuted}>
                  {inCount.toLocaleString('en-US')} of {members}
                </Text>
              ) : null}
            </View>
            <View style={styles.whoRow}>
              <View style={styles.faces}>
                {faces.map((face, i) => (
                  <Avatar
                    key={i}
                    source={face}
                    size={WHO_FACE_SIZE}
                    style={[styles.face, i > 0 && styles.faceOverlap]}
                  />
                ))}
              </View>
              <Text variant="copy" color={colors.inkMuted} style={styles.whoText}>
                <Text variant="copyBold">{listNames(named)}</Text>
                {others > 0 ? ` + ${others.toLocaleString('en-US')} others` : ''}
              </Text>
            </View>
          </View>
        </View>
      </ScreenScroll>

      {/* Once it's under way there is nothing left to do here — joining has
          closed, and today's photos are the Tasks tab's — so the page ends
          with the people still in it. */}
      {!going ? (
        <View
          onLayout={(e) => setDockHeight(e.nativeEvent.layout.height)}
          style={[styles.dock, { paddingTop: layout.block, paddingBottom: dockGap }]}
        >
          {mode === 'preview' ? (
            <>
              <PrimaryButton
                label={`Join · starts ${longDate(start)}`}
                onPress={() => router.push({ pathname: '/join/[id]', params: { id: section.id } })}
              />
              <Text variant="meta" color={colors.inkMuted} center>
                Joining closes when it starts · ends {longDate(end)}
              </Text>
            </>
          ) : (
            <>
              <PrimaryButton
                label="Invite a friend"
                icon="person-add-outline"
                onPress={() => {
                  Share.share({
                    message: `Join me on ${challenge.name} — we start ${longDate(start)}.`,
                  }).catch(() => {});
                }}
              />
              <Text variant="meta" color={colors.inkMuted} center>
                They can join until it starts ·{' '}
                <Text variant="metaBold" onPress={toTasks}>
                  Edit reminders
                </Text>
              </Text>
            </>
          )}
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

/** "You, Lily and Zoe": names run together the way you'd say them. */
function listNames(names: readonly string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * The photos across the top of a challenge's page, edge to edge, with its
 * name, where it stands and whose it is laid over them. The way back sits on
 * the photo rather than in a bar, so the picture runs up to the top edge; it
 * scrolls away with it, and the edge swipe is the way back from further down.
 */
function Hero({
  section,
  badge,
  badgeIcon,
  badgeTo,
  onOpenPhoto,
}: {
  section: DiscoverSection;
  badge: string;
  /** A mark in front of the badge's words: a tick once you're in, a lock
   * once joining has closed. */
  badgeIcon?: keyof typeof Ionicons.glyphMap;
  /** The far end of a range in the badge, "Jun 1 → Aug 14". */
  badgeTo?: string;
  onOpenPhoto: (index: number) => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const challenge = challengeById(section.id);
  const creator = PEOPLE.find((p) => p.id === section.creatorId) ?? PEOPLE[0];

  const half = width / 2;
  const quarter = HERO_HEIGHT / 2;
  const photo = (i: number, w: number, h: number) =>
    section.photos[i] ? (
      <Pressable
        accessibilityRole="imagebutton"
        accessibilityLabel={`Open photo ${i + 1}`}
        onPress={() => onOpenPhoto(i)}
      >
        <Image source={section.photos[i]} style={{ width: w, height: h }} contentFit="cover" />
      </Pressable>
    ) : null;

  return (
    <View style={styles.hero}>
      <View style={styles.heroPhotos}>
        {photo(0, half, HERO_HEIGHT)}
        <View>
          {photo(1, half, quarter)}
          {photo(2, half, quarter)}
        </View>
      </View>
      <LinearGradient
        colors={gradients.coverShade}
        locations={[0.45, 1]}
        style={absoluteFill}
        pointerEvents="none"
      />
      <IconButton
        name="chevron-back"
        size={cornerButtonSize}
        iconSize={cornerIconSize}
        background={colors.surface}
        onPress={() => router.back()}
        accessibilityLabel="Go back"
        style={[styles.heroBack, { top: Math.max(headerLineTop, topPadding(insets.top)) }]}
      />
      <View style={styles.heroCaption}>
        <Pill
          label={badge}
          icon={badgeIcon}
          to={badgeTo}
          size="sm"
          tone="floating"
          bold
          style={styles.heroBadge}
        />
        <Text variant="title" color={colors.inkInverse}>
          {challenge.name}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View ${creator.name}'s profile`}
          onPress={() => router.push({ pathname: '/friend/[id]', params: { id: creator.id } })}
          style={({ pressed }) => [styles.heroCreator, pressed && styles.pressed]}
        >
          <Avatar source={creator.avatar} size={HERO_AVATAR_SIZE} />
          <Text variant="meta" color={colors.inkInverse}>
            {[challenge.category, `by ${creator.handle}`].filter(Boolean).join(' · ')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * A round that is over: the photos with its dates, then your own run first,
 * how many of everyone made it to the last day, the podium for the longest
 * streaks and everyone under it by theirs — all of them or just your friends
 * — and last what the round asked, in figures and task by task. A streak is
 * the round's one fair measure — everyone had the same days — so people on
 * the same one share a spot rather than being put in an order nobody earned.
 */
function Finished({
  section,
  start,
  end,
  results,
}: {
  section: DiscoverSection;
  start: Date;
  end: Date;
  results: NonNullable<DiscoverSection['results']>;
}) {
  const router = useRouter();
  const { profile } = useApp();
  const [openPhotoIndex, setOpenPhotoIndex] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [board, setBoard] = useState<'everyone' | 'friends'>('everyone');

  const challenge = challengeById(section.id);
  const totalDays = challenge.defaultDays;
  const lives = challenge.lives ?? LIVES_PER_CHALLENGE;
  const members = section.members.toLocaleString('en-US');
  const ranOut = section.members - results.finished;
  const myAvatar: AvatarSource = profile.avatar ?? profile.avatarSeed;
  const faceOf = (person: Standing): AvatarSource =>
    person.personId === ME
      ? myAvatar
      : PEOPLE.find((p) => p.id === person.personId)?.avatar;
  // The finishers with a face to show lead; everyone else who made it is the
  // count on the last disc.
  const finisherFaces = results.groups
    .filter((g) => g.finished)
    .flatMap((g) => g.named)
    .map(faceOf)
    .filter((face) => !!face)
    .slice(0, FINISHER_FACES);
  const moreFinishers = results.finished - finisherFaces.length;
  const openProfile = (person: Standing) => {
    const id = person.personId;
    return id && id !== ME
      ? () => router.push({ pathname: '/friend/[id]', params: { id } })
      : undefined;
  };

  // Second, first, third, the way a podium stands: the winners in the middle
  // on the tallest step.
  const top = results.groups.filter((g) => g.finished).slice(0, 3);
  const podium = [
    { group: top[1], place: 2 },
    { group: top[0], place: 1 },
    { group: top[2], place: 3 },
  ];

  // Where you finished, if you were in it: your group's streak and its rank.
  const myRank = results.groups.findIndex((g) => g.named.some((p) => p.personId === ME));
  const myGroup = myRank >= 0 ? results.groups[myRank] : null;
  const shareRecap = () => {
    if (!myGroup) return;
    Share.share({
      message: `I did ${challenge.name} on Her 75 — a ${myGroup.days}-day streak, #${myRank + 1} of ${members}.`,
    }).catch(() => {});
  };

  // Friends narrows the list to the people you know, you included; each
  // keeps the rank it has among everyone, so a spot means the same on both.
  const friendIds = new Set(FRIENDS.map((f) => f.id));
  const onBoard = (person: Standing) =>
    board === 'everyone' || person.personId === ME || friendIds.has(person.personId ?? '');
  const boardGroups = results.groups
    .map((group, i) => ({ ...group, rank: i + 1, named: group.named.filter(onBoard) }))
    .filter((group) => group.named.length > 0);

  // Down the groups, a tie one rank. Past the finishers everyone's list stops
  // a few rows in until See all; your friends are few enough to show whole.
  const rows: React.ReactNode[] = [];
  let ranOutShown = 0;
  let cut = false;
  boardGroups.forEach((group, i) => {
    const rank = group.rank;
    if (!group.finished && (i === 0 || boardGroups[i - 1].finished)) {
      rows.push(
        <View key="ran-out" style={styles.ranOut}>
          <View style={styles.ranOutRule} />
          <Text variant="metaBold" color={colors.inkMuted}>
            Ran out of lives · {ranOut.toLocaleString('en-US')}
          </Text>
          <View style={styles.ranOutRule} />
        </View>,
      );
    }
    for (const person of group.named) {
      if (!group.finished && board === 'everyone') {
        if (!showAll && ranOutShown === RAN_OUT_PREVIEW) {
          cut = true;
          return;
        }
        ranOutShown += 1;
      }
      rows.push(
        <StandingRow
          key={`${group.days}-${person.name}`}
          rank={rank}
          name={person.name}
          face={faceOf(person)}
          value={`${group.days} days`}
          mine={person.personId === ME}
          onPress={openProfile(person)}
        />,
      );
    }
  });

  return (
    <View style={styles.screenRoot}>
      <ScreenScroll padded={false} contentContainerStyle={styles.previewScroll}>
        <Hero
          section={section}
          badge={`Finished · ${shortDate(start)}`}
          badgeIcon="trophy-outline"
          badgeTo={shortDate(end)}
          onOpenPhoto={setOpenPhotoIndex}
        />

        <View style={styles.finishedBody}>
          {/* Your own run leads, on ink: the one result on the page that's
              yours, before anyone else's. */}
          {myGroup ? (
            <View style={styles.runCard}>
              <View style={styles.runHead}>
                <View style={styles.runFace}>
                  <Avatar source={myAvatar} size={RUN_FACE - RUN_RIM * 2} />
                </View>
                <View style={styles.runTitle}>
                  <Text variant="badge" color={colors.inkGhost}>
                    YOUR RUN
                  </Text>
                  <Text variant="itemTitle" color={colors.inkInverse}>
                    {myGroup.finished
                      ? `You made it to Day ${totalDays}`
                      : `You kept it up ${myGroup.days} days`}
                  </Text>
                </View>
              </View>
              <View style={styles.runStats}>
                {/* Each centred in its own third with a seam between, the
                    way the round's figures below sit — the row fills the
                    card without the three drifting to its edges. */}
                <RunStat value={String(myGroup.days)} label="best streak" />
                <RunStat value={`#${myRank + 1}`} label={`of ${members}`} ruled />
                <RunStat
                  value={(myGroup.days * challenge.tasks.length).toLocaleString('en-US')}
                  label="photos"
                  ruled
                />
              </View>
              <Pill
                label="Share your recap"
                icon="share-outline"
                tone="floating"
                bold
                onPress={shareRecap}
                style={styles.runShare}
              />
            </View>
          ) : null}

          <View style={styles.block}>
            <View style={styles.podiumHeading}>
              <Text variant="sectionHeading">Finishers</Text>
              <Text variant="metaBold" color={colors.inkMuted}>
                {results.finished} of {members}
              </Text>
            </View>
            {finisherFaces.length > 0 || moreFinishers > 0 ? (
              <View style={styles.finishers}>
                {finisherFaces.map((face, i) => (
                  <View key={i} style={[styles.finisherDisc, i > 0 && styles.finisherLapped]}>
                    <Avatar source={face} size={FINISHER_FACE - PODIUM_RIM * 2} />
                  </View>
                ))}
                {moreFinishers > 0 ? (
                  <View
                    style={[
                      styles.finisherDisc,
                      finisherFaces.length > 0 && styles.finisherLapped,
                      styles.podiumMore,
                    ]}
                  >
                    <Text variant="badge" color={colors.inkInverse}>
                      +{moreFinishers}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
            <Text variant="meta" color={colors.inkMuted}>
              made it to the end · {ranOut.toLocaleString('en-US')} ran out of lives
            </Text>
          </View>

          {top.length > 0 ? (
            <View style={styles.podiumBlock}>
              <View style={styles.podiumHeading}>
                <Text variant="sectionHeading">Biggest streaks</Text>
              </View>
              <View style={styles.podium}>
                {podium.map(({ group, place }) =>
                  group ? (
                    <PodiumPlace
                      key={place}
                      group={group}
                      place={place}
                      faces={group.named.map(faceOf).filter((face) => !!face)}
                      mine={group.named.some((p) => p.personId === ME)}
                      perfect={group.days === totalDays}
                    />
                  ) : null,
                )}
              </View>
            </View>
          ) : null}

          <View>
            <SegmentedTabs
              options={[
                { key: 'everyone', label: 'Everyone' },
                { key: 'friends', label: 'Friends' },
              ]}
              value={board}
              onChange={setBoard}
              style={styles.boardSwitch}
            />
            {rows}
            {cut ? (
              <Pill
                label={`See all ${members}`}
                size="lg"
                labelVariant="copyBold"
                onPress={() => setShowAll(true)}
                style={styles.seeAll}
              />
            ) : null}
          </View>

          {/* What the round asked, in three figures — the terms the preview
              spelled out row by row, now it's over. */}
          <View style={styles.roundStats}>
            <RoundStat value={String(totalDays)} label="days" />
            <RoundStat
              value={String(challenge.tasks.length)}
              label={challenge.tasks.length === 1 ? 'photo a day' : 'photos a day'}
              ruled
            />
            <RoundStat value={String(lives)} label={lives === 1 ? 'life' : 'lives'} ruled />
          </View>

          <View style={styles.block}>
            <Text variant="sectionHeading">Tasks</Text>
            {/* Just the names: how to do each one was for the people doing
                it, and the round is over. */}
            {challenge.tasks.map((task) => (
              <View key={task.id} style={styles.taskRow}>
                <View style={styles.taskCircle} />
                <Text variant="copyBold" style={styles.taskText}>
                  {task.label}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScreenScroll>

      <PhotoViewer
        photos={section.photos}
        index={openPhotoIndex}
        onDismiss={() => setOpenPhotoIndex(null)}
      />
    </View>
  );
}

/** One figure on the Your run card: white on the ink, its label under it. */
function RunStat({ value, label, ruled }: { value: string; label: string; ruled?: boolean }) {
  return (
    <View style={[styles.runStat, ruled && styles.runStatRule]}>
      <Text variant="sectionHeading" color={colors.inkInverse}>
        {value}
      </Text>
      <Text variant="badge" color={colors.inkGhost}>
        {label}
      </Text>
    </View>
  );
}

/** One of the round's figures, centred in its third of the grey strip. */
function RoundStat({ value, label, ruled }: { value: string; label: string; ruled?: boolean }) {
  return (
    <View style={[styles.roundStat, ruled && styles.roundStatRule]}>
      <Text variant="itemTitle">{value}</Text>
      <Text variant="badge" color={colors.inkMuted}>
        {label}
      </Text>
    </View>
  );
}

/**
 * One spot on the podium: the faces sharing it lapped together with a "+N"
 * for the rest, who they are, and the step with the place and the streak.
 * First stands on the ink step; a full run of days wears the accent tag, the
 * colour of progress, since it is the one streak nobody can beat.
 */
function PodiumPlace({
  group,
  place,
  faces,
  mine,
  perfect,
}: {
  group: StreakGroup;
  place: number;
  faces: readonly AvatarSource[];
  /** You're in this group, so it says so. */
  mine: boolean;
  perfect: boolean;
}) {
  const first = place === 1;
  const size = first ? PODIUM_FACE_TOP : PODIUM_FACE;
  const overlap = first ? PODIUM_OVERLAP_TOP : PODIUM_OVERLAP;
  const shown = faces.slice(0, PODIUM_FACES);
  const more = group.count - shown.length;
  const discs = shown.length + (more > 0 ? 1 : 0);
  const disc = (i: number) => [
    styles.podiumDisc,
    { width: size, height: size },
    i > 0 && { marginLeft: overlap },
    // In the middle the first face leads, the rest tucked under it.
    first && { zIndex: discs - i },
  ];
  // Two names fit under a step; past that it's a count.
  const who =
    group.count <= 2 && group.named.length === group.count
      ? group.named.map((p) => p.name).join(', ')
      : `${group.count} people`;

  return (
    <View style={styles.podiumPlace}>
      {first && perfect ? (
        <LinearGradient
          colors={gradients.accent}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.tag}
        >
          <Text variant="badge" numberOfLines={1}>
            No misses
          </Text>
        </LinearGradient>
      ) : null}
      <View style={styles.podiumFaces}>
        {shown.map((face, i) => (
          <View key={i} style={disc(i)}>
            <Avatar source={face} size={size - PODIUM_RIM * 2} />
          </View>
        ))}
        {more > 0 ? (
          <View style={[disc(shown.length), styles.podiumMore]}>
            <Text variant="metaBold" color={colors.inkInverse}>
              +{more}
            </Text>
          </View>
        ) : null}
      </View>
      {mine ? (
        <Pill
          label="You're here"
          tone="solid"
          size="sm"
          labelVariant="badge"
          style={styles.tagPill}
        />
      ) : null}
      <Text variant="copyBold" center numberOfLines={1}>
        {who}
      </Text>
      <View style={[styles.step, { height: STEP_HEIGHTS[place - 1] }, first && styles.stepFirst]}>
        <Text variant="sectionHeading" color={first ? colors.inkInverse : colors.ink}>
          {place}
        </Text>
        <Text variant="badge" color={first ? colors.inkGhost : colors.inkMuted}>
          {group.days} days
        </Text>
      </View>
    </View>
  );
}

/** A row of the standings: rank, face — or an initial for someone with no
 * profile here — name and streak. Your own row sits on the fill grey. */
function StandingRow({
  rank,
  name,
  face,
  value,
  mine,
  onPress,
}: {
  rank: number;
  name: string;
  face: AvatarSource;
  value: string;
  mine?: boolean;
  onPress?: () => void;
}) {
  const content = (
    <>
      <Text variant="metaBold" color={colors.inkMuted} center style={styles.rank}>
        {rank}
      </Text>
      {face ? (
        <Avatar source={face} size={STANDING_FACE} />
      ) : (
        <View style={[styles.standingFace, styles.standingInitial]}>
          <Text variant="copyBold">{name.charAt(0)}</Text>
        </View>
      )}
      <Text variant="copyBold" numberOfLines={1} style={styles.standingName}>
        {name}
      </Text>
      <Text variant="metaBold" color={colors.inkMuted}>
        {value}
      </Text>
    </>
  );
  if (!onPress) {
    return <View style={[styles.standing, mine && styles.standingMine]}>{content}</View>;
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${name}'s profile`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.standing,
        mine && styles.standingMine,
        pressed && styles.pressed,
      ]}
    >
      {content}
    </Pressable>
  );
}

/** "Lose all three and your run ends": what the lives allow, in words. */
function livesRule(lives: number): string {
  if (lives === 0) {
    return 'Miss a day — any task not photographed by midnight — and your run ends; you can still watch everyone else finish.';
  }
  const all = lives === 1 ? 'it' : `all ${COUNT_WORDS[lives] ?? lives}`;
  return `Miss a day — any task not photographed by midnight — and you lose a life. Lose ${all} and your run ends; you can still watch everyone else finish.`;
}

/** One row of How it works: an icon on a white disc, what the fact is and
 * what it means for you, and its value at the end. */
function Term({
  icon,
  label,
  value,
  hint,
  ruled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: React.ReactNode;
  hint: string;
  /** Every row after the first draws the seam above it. */
  ruled?: boolean;
}) {
  return (
    <View style={[styles.term, ruled && styles.termRule]}>
      <View style={styles.termIcon}>
        <Ionicons name={icon} size={18} color={colors.ink} />
      </View>
      <View style={styles.termText}>
        <Text variant="copy">{label}</Text>
        <Text variant="meta" color={colors.inkMuted}>
          {hint}
        </Text>
      </View>
      {typeof value === 'string' ? (
        <Text variant="copyBold" numberOfLines={1}>
          {value}
        </Text>
      ) : (
        value
      )}
    </View>
  );
}

/**
 * The time left, spelled out by unit — "47d 18h 21m". Under a day the
 * days drop off and the seconds come in, "18h 21m 05s", since they are what
 * make it read as a clock running rather than a date; ticks every second.
 */
function Countdown({ to }: { to: Date }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), SECOND_MS);
    return () => clearInterval(id);
  }, []);

  const left = Math.max(0, to.getTime() - now);
  const days = Math.floor(left / DAY_MS);
  const hours = Math.floor((left % DAY_MS) / HOUR_MS);
  const minutes = Math.floor((left % HOUR_MS) / MINUTE_MS);
  // Two figures, so the last unit doesn't jump in width as it ticks.
  const seconds = String(Math.floor((left % MINUTE_MS) / SECOND_MS)).padStart(2, '0');

  return (
    <Text variant="copyBold" numberOfLines={1} style={styles.clock}>
      {days > 0 ? `${days}d ${hours}h ${minutes}m` : `${hours}h ${minutes}m ${seconds}s`}
    </Text>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: colors.backgroundPlain,
  },
  // The page runs up under the status bar: the photos are its top edge.
  previewScroll: {
    paddingTop: 0,
  },
  hero: {
    height: HERO_HEIGHT,
  },
  heroPhotos: {
    flexDirection: 'row',
  },
  heroCaption: {
    position: 'absolute',
    left: layout.gutter,
    right: layout.gutter,
    bottom: layout.gutter,
    gap: layout.line,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    marginBottom: layout.line,
  },
  heroCreator: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: layout.stack,
  },
  heroBack: {
    position: 'absolute',
    left: layout.gutter,
  },
  previewBody: {
    padding: layout.gutter,
    gap: layout.section,
  },
  block: {
    gap: layout.heading,
  },
  terms: {
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceSunken,
    overflow: 'hidden',
  },
  term: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.inline,
    paddingVertical: layout.block,
    paddingHorizontal: layout.card,
  },
  termRule: {
    borderTopWidth: TERM_RULE,
    borderTopColor: colors.surface,
  },
  termIcon: {
    width: TERM_ICON_SIZE,
    height: TERM_ICON_SIZE,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  termText: {
    flex: 1,
  },
  // Figures of one width, so the clock holds still as it ticks.
  clock: {
    fontVariant: ['tabular-nums'],
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: layout.inline,
  },
  // Sits on the task name's line rather than the pair's middle.
  taskCircle: {
    width: TASK_CIRCLE_SIZE,
    height: TASK_CIRCLE_SIZE,
    marginTop: layout.line / 2,
    borderRadius: radii.pill,
    borderWidth: TASK_CIRCLE_RULE,
    borderColor: colors.inkGhost,
  },
  // The tick takes the ring's place on the task name's line.
  taskTick: {
    marginTop: layout.line / 2,
  },
  taskText: {
    flex: 1,
  },
  livesCard: {
    gap: layout.heading,
    padding: layout.card,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceSunken,
  },
  hearts: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  whoBlock: {
    gap: layout.heading,
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
  finishedBody: {
    paddingTop: layout.section,
    paddingHorizontal: layout.gutter,
    gap: layout.section,
  },
  runCard: {
    gap: layout.block,
    padding: layout.card,
    borderRadius: radii.card,
    backgroundColor: colors.ink,
  },
  runHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.inline,
  },
  runFace: {
    width: RUN_FACE,
    height: RUN_FACE,
    borderRadius: radii.pill,
    borderWidth: RUN_RIM,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  runTitle: {
    flex: 1,
  },
  runStats: {
    flexDirection: 'row',
  },
  runStat: {
    flex: 1,
    alignItems: 'center',
  },
  // A seam a shade up from the ink, the dark card's version of the white
  // one between the round's figures.
  runStatRule: {
    borderLeftWidth: TERM_RULE,
    borderLeftColor: colors.inkSoft,
  },
  // The card's full width, like the page's own buttons.
  runShare: {
    alignSelf: 'stretch',
  },
  boardSwitch: {
    marginBottom: layout.stack,
  },
  // The fill grey strip, cut in three by white seams like How it works'
  // rows were.
  roundStats: {
    flexDirection: 'row',
    paddingVertical: layout.block,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceSunken,
  },
  roundStat: {
    flex: 1,
    alignItems: 'center',
  },
  roundStatRule: {
    borderLeftWidth: TERM_RULE,
    borderLeftColor: colors.surface,
  },
  finishers: {
    flexDirection: 'row',
  },
  finisherDisc: {
    width: FINISHER_FACE,
    height: FINISHER_FACE,
    borderRadius: radii.pill,
    borderWidth: PODIUM_RIM,
    borderColor: colors.surface,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  },
  finisherLapped: {
    marginLeft: FINISHER_OVERLAP,
  },
  // The count and what it counts read as one line, sat on a shared baseline
  // and free to wrap on a narrow phone.
  finishedLines: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: layout.stack,
  },
  podiumBlock: {
    gap: layout.block,
  },
  podiumHeading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: layout.stack,
  },
  podiumPlace: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: layout.stack,
  },
  podiumFaces: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  podiumDisc: {
    borderRadius: radii.pill,
    borderWidth: PODIUM_RIM,
    borderColor: colors.surface,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.hard,
  },
  podiumMore: {
    backgroundColor: colors.ink,
  },
  tag: {
    height: TAG_HEIGHT,
    paddingHorizontal: layout.pill,
    borderRadius: radii.pill,
    justifyContent: 'center',
  },
  tagPill: {
    height: TAG_HEIGHT,
    paddingHorizontal: layout.pill,
    alignSelf: 'center',
  },
  step: {
    width: '100%',
    alignItems: 'center',
    paddingTop: layout.stack,
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
    backgroundColor: colors.surfaceSunken,
  },
  stepFirst: {
    backgroundColor: colors.ink,
  },
  listHeading: {
    marginBottom: layout.line,
  },
  standing: {
    height: STANDING_ROW,
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.inline,
  },
  // Your own row on the fill grey, the band pushed out past the column so
  // the rank and face stay lined up with every other row.
  standingMine: {
    paddingHorizontal: layout.stack,
    marginHorizontal: -layout.stack,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSunken,
  },
  rank: {
    width: RANK_WIDTH,
  },
  standingFace: {
    width: STANDING_FACE,
    height: STANDING_FACE,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  standingInitial: {
    backgroundColor: colors.surfaceSunken,
  },
  standingName: {
    flex: 1,
  },
  ranOut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.stack,
    marginTop: layout.stack,
    marginBottom: layout.line,
  },
  // A hairline either side of the label, in the older divider grey: the
  // fill grey all but vanishes at a pixel on white.
  ranOutRule: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },
  seeAll: {
    alignSelf: 'stretch',
    marginTop: layout.stack,
    backgroundColor: colors.surfaceSunken,
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
