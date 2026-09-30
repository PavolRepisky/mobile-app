import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, type AvatarSource } from '@/components/Avatar';
import { IconButton, cornerButtonSize, cornerIconSize } from '@/components/IconButton';
import { PhotoStrip } from '@/components/PhotoStrip';
import { PhotoViewer } from '@/components/PhotoViewer';
import { Pill } from '@/components/Pill';
import { PrimaryButton } from '@/components/Buttons';
import { headerLineTop, ScreenScroll, topPadding } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { DateRange } from '@/components/DateRange';
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

/** The disc holding the lock (or the flag, once a round is over). */
const STATUS_ICON_SIZE = 40;

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

/** The empty circle leading each task — hollow, since nothing is ticked
 * until Day 1 — in the ring weight of the create form's focus ring. */
const TASK_CIRCLE_SIZE = 22;
const TASK_CIRCLE_RULE = 2;

/** Faces in the "who's in" stack, and how far each tucks under the last. */
const WHO_FACES = 4;
const WHO_FACE_SIZE = 30;
const FACE_OVERLAP = -9;
const FACE_RIM = 2;

/** "Lose all three": the lives spelled out, up to the most a round offers. */
const COUNT_WORDS = ['no', 'one', 'two', 'three', 'four', 'five'];

/** The creator's face, leading the row with their name. */
const CREATOR_AVATAR_SIZE = 40;

/** The still-going row: how many faces it shows before the "+N" circle,
 * their size, and how far each laps over the last. */
const GOING_FACES = 6;
const GOING_FACE_SIZE = 48;
const GOING_FACE_OVERLAP = -12;

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

/**
 * A challenge's page, in one of two shapes. Before its Day 1 it is the
 * invitation, with Join docked at the bottom leading on to the pledge.
 * Once it has started, or finished, joining is closed, so the page shows how
 * the round is going instead.
 */
export default function FeedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [openPhotoIndex, setOpenPhotoIndex] = useState<number | null>(null);

  const section = DISCOVER.find((s) => s.id === String(id)) ?? DISCOVER[0];
  const challenge = challengeById(section.id);
  const creator = PEOPLE.find((p) => p.id === section.creatorId) ?? PEOPLE[0];
  const totalDays = challenge.defaultDays;
  const start = localDay(section.startDate);
  const end = addDays(start, totalDays - 1);
  const state = roundState(start, totalDays);

  if (state.kind === 'upcoming') {
    return <Preview section={section} start={start} end={end} totalDays={totalDays} />;
  }
  if (state.kind === 'ended' && section.results) {
    return (
      <Finished section={section} start={start} end={end} results={section.results} />
    );
  }

  const openProfile = (personId: string) =>
    router.push({ pathname: '/friend/[id]', params: { id: personId } });

  return (
    <View style={styles.screenRoot}>
      {/* The title and the way back share the scroll's fixed header, so the
          back button stays level with the name instead of floating over the
          photos once they scroll up under it. */}
      <ScreenScroll header={<ScreenHeader plainTitle={challenge.name} />}>
        <PhotoStrip
          photos={section.photos}
          height={170}
          onPressPhoto={setOpenPhotoIndex}
          style={styles.strip}
        />

        <View style={styles.body}>
          {/* Whose challenge this is — a fact about it that happens to open
              their profile, the same pair a post's avatar and name open one
              from. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View ${creator.name}'s profile`}
            onPress={() => openProfile(creator.id)}
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

          <Started
            section={section}
            start={start}
            end={end}
            totalDays={totalDays}
            day={state.kind === 'running' ? state.day : null}
          />
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

/**
 * The page before Day 1, the invitation to join: the photos edge to edge
 * with the name, when it starts and whose it is laid over them; then the
 * round at a glance, the clock to Day 1, what it asks of you each day, the
 * lives rule spelled out, and who is already in. Join is docked at the
 * bottom and leads on to the pledge.
 */
function Preview({
  section,
  start,
  end,
  totalDays,
}: {
  section: DiscoverSection;
  start: Date;
  end: Date;
  totalDays: number;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
  const daysToGo = Math.round((start.getTime() - today.getTime()) / DAY_MS);
  const startsIn = daysToGo <= 1 ? 'Starts tomorrow' : `Starts in ${daysToGo} days`;
  // Friends stand in for whoever has joined so far, the way the browse
  // cards' own face stacks do — `PEOPLE` leads with them — and the names
  // are theirs.
  const faces = PEOPLE.slice(0, WHO_FACES);
  const named = FRIENDS.slice(0, 2).map((f) => f.name);
  const others = section.members - named.length;

  // The same gap the floating tab bar keeps off the bottom edge, so the dock
  // reads as that bar filled in rather than a button adrift over a long
  // stretch of safe area.
  const dockGap = tabBarBottom(insets.bottom);

  return (
    <View style={styles.screenRoot}>
      <ScreenScroll
        padded={false}
        contentContainerStyle={styles.previewScroll}
        bottomExtra={Math.max(0, dockHeight - insets.bottom)}
      >
        <Hero
          section={section}
          badge={`${startsIn} · ${longDate(start)}`}
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
                label="Starts in"
                value={<Countdown to={start} />}
                hint={`${longDate(start)} — everyone starts together`}
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

          <View style={styles.block}>
            <Text variant="sectionHeading">Every day you'll</Text>
            {challenge.tasks.map((task) => (
              <View key={task.id} style={styles.taskRow}>
                <View style={styles.taskCircle} />
                <View style={styles.taskText}>
                  <Text variant="copyBold">{task.label}</Text>
                  {task.note ? (
                    <Text variant="meta" color={colors.inkMuted}>
                      {task.note}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>

          {/* The rule that costs people a run, spelled out before they join
              rather than discovered on the day they miss. */}
          <View style={styles.livesCard}>
            {lives > 0 ? (
              <View style={styles.hearts}>
                {Array.from({ length: lives }, (_, i) => (
                  <Ionicons key={i} name="heart" size={HEART_SIZE} color={colors.ink} />
                ))}
              </View>
            ) : null}
            <Text variant="itemTitle">
              {lives === 0
                ? 'No lives'
                : `You have ${lives} ${lives === 1 ? 'life' : 'lives'}`}
            </Text>
            <Text variant="copy" color={colors.inkMuted}>
              {livesRule(lives)}
            </Text>
          </View>

          <View style={styles.whoBlock}>
            <Text variant="sectionHeading">Who's in</Text>
            <View style={styles.whoRow}>
              <View style={styles.faces}>
                {faces.map((friend, i) => (
                  <Avatar
                    key={friend.id}
                    source={friend.avatar}
                    size={WHO_FACE_SIZE}
                    style={[styles.face, i > 0 && styles.faceOverlap]}
                  />
                ))}
              </View>
              <Text variant="copy" color={colors.inkMuted} style={styles.whoText}>
                <Text variant="copyBold">{named.join(' and ')}</Text>
                {others > 0 ? ` + ${others.toLocaleString('en-US')} others` : ''}
              </Text>
            </View>
          </View>
        </View>
      </ScreenScroll>

      <View
        onLayout={(e) => setDockHeight(e.nativeEvent.layout.height)}
        style={[styles.dock, { paddingTop: layout.block, paddingBottom: dockGap }]}
      >
        <PrimaryButton
          label={`Join · starts ${longDate(start)}`}
          onPress={() => router.push({ pathname: '/join/[id]', params: { id: section.id } })}
        />
        <Text variant="meta" color={colors.inkMuted} center>
          Joining closes when it starts · ends {longDate(end)}
        </Text>
      </View>

      <PhotoViewer
        photos={section.photos}
        index={openPhotoIndex}
        onDismiss={() => setOpenPhotoIndex(null)}
      />
    </View>
  );
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
  badgeTo,
  onOpenPhoto,
}: {
  section: DiscoverSection;
  badge: string;
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
 * A round that is over: the photos with its dates, then how many of everyone
 * made it to the last day, the podium for the longest streaks and everyone
 * under it by theirs. A streak is the round's one fair measure — everyone had
 * the same days — so people on the same one share a spot rather than being
 * put in an order nobody earned.
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

  // Down the groups, a tie one rank. Past the finishers it stops a few rows
  // in until See all.
  const rows: React.ReactNode[] = [];
  let ranOutShown = 0;
  let cut = false;
  results.groups.forEach((group, i) => {
    const rank = i + 1;
    if (!group.finished && (i === 0 || results.groups[i - 1].finished)) {
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
      if (!group.finished) {
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
          badgeTo={shortDate(end)}
          onOpenPhoto={setOpenPhotoIndex}
        />

        <View style={styles.finishedBody}>
          <View style={styles.podiumBlock}>
            <Text variant="sectionHeading">Finishers</Text>
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
            <View style={styles.finishedLines}>
              <Text variant="stat">
                {results.finished}{' '}
                <Text variant="sectionHeading" color={colors.inkMuted}>
                  of {members}
                </Text>
              </Text>
              <Text variant="copy" color={colors.inkMuted}>
                made it to the end
              </Text>
            </View>
          </View>

          {/* What it took, laid out the way the preview laid it out before
              the start — the same terms, description and tasks, told in the
              past now the round is over. */}
          <View style={styles.block}>
            <Text variant="sectionHeading">How it worked</Text>
            <View style={styles.terms}>
              <Term
                icon="calendar-outline"
                label="Length"
                value={`${totalDays} days`}
                hint={`${longDate(start)} – ${longDate(end)}`}
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
                    ? 'One missed day ended a run'
                    : `A ${ordinal(lives + 1)} missed day ended a run`
                }
                ruled
              />
            </View>
          </View>

          <Text variant="copy" color={colors.inkMuted}>
            {challenge.description}
          </Text>

          <View style={styles.block}>
            <Text variant="sectionHeading">Every day they'd</Text>
            {challenge.tasks.map((task) => (
              <View key={task.id} style={styles.taskRow}>
                <View style={styles.taskCircle} />
                <View style={styles.taskText}>
                  <Text variant="copyBold">{task.label}</Text>
                  {task.note ? (
                    <Text variant="meta" color={colors.inkMuted}>
                      {task.note}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
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
              {top.some((g) => g.count > 1) ? (
                <Text variant="meta" color={colors.inkMuted} center>
                  Same streak, same spot.
                </Text>
              ) : null}
            </View>
          ) : null}

          <View>
            <Text variant="metaBold" color={colors.inkMuted} style={styles.listHeading}>
              EVERYONE · BY LONGEST STREAK
            </Text>
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
 * The body once Day 1 has passed: where the round is and that joining has
 * closed, then how many are still in it. A finished round with its standings
 * gets its own page, `Finished`.
 */
function Started({
  section,
  start,
  end,
  totalDays,
  day,
}: {
  section: DiscoverSection;
  start: Date;
  end: Date;
  totalDays: number;
  /** Today's day of the round, or null once it has finished. */
  day: number | null;
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

      {day !== null && section.stillGoing !== undefined ? (
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
 * The time to Day 1 as a clock, "17:03:38", with the days in front once
 * there are any — "3d 07:21". Under a day the seconds show, since they are
 * what make it read as a clock running rather than a date; ticks every
 * second.
 */
function Countdown({ to }: { to: Date }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), SECOND_MS);
    return () => clearInterval(id);
  }, []);

  const left = Math.max(0, to.getTime() - now);
  const days = Math.floor(left / DAY_MS);
  const two = (n: number) => String(n).padStart(2, '0');
  const hours = two(Math.floor((left % DAY_MS) / HOUR_MS));
  const minutes = two(Math.floor((left % HOUR_MS) / MINUTE_MS));
  const seconds = two(Math.floor((left % MINUTE_MS) / SECOND_MS));

  return (
    <Text variant="copyBold" numberOfLines={1} style={styles.clock}>
      {days > 0 ? `${days}d ${hours}:${minutes}` : `${hours}:${minutes}:${seconds}`}
    </Text>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: colors.backgroundPlain,
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
  finishedBody: {
    paddingTop: layout.section,
    paddingHorizontal: layout.gutter,
    gap: layout.section,
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
