import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { Avatar } from '@/components/Avatar';
import { ChallengeRow } from '@/components/ChallengeRow';
import { IconButton, cornerButtonSize, cornerIconSize } from '@/components/IconButton';
import { Pill } from '@/components/Pill';
import { ScreenScroll } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Text } from '@/components/Text';
import { absoluteFill, colors, gradients, layout, radii, spacing } from '@/constants/theme';
import { FRIENDS } from '@/data/content';
import { useApp } from '@/hooks/useAppState';
import { CATEGORIES, useChallengeCards, type ChallengeCard } from '@/hooks/useChallengeCards';
import { addDays, longDate } from '@/lib/format';

/** Tall enough that the cover is the page's one picture — it carries the
 * whole pitch, dates to Join — and still leaves "Starting soon" peeking
 * under it on a standard phone. */
const COVER_HEIGHT = 420;
/** A topic tile: a name and a count over a photo, not a card to read. */
const TILE_HEIGHT = 104;
/** The faces on a cover — the friends named in its line. */
const COVER_FACES = FRIENDS.slice(0, 2);
const COVER_FACE_SIZE = 24;
/** The thumbnail on "You're in", a step smaller than a list row's. */
const MINE_THUMB = 44;
/** The slider's dots, under it: the current one stretched into a short
 * bar, so where you are reads at a glance. */
const DOT = 6;
const DOT_ACTIVE = 18;

/**
 * Challenges. From the top: the one you're in, the soonest round you can
 * still join as a cover, every other one you can join in a Starting soon
 * slider under it — one row a swipe, dots underneath — and a tile per
 * topic. Every round starts on one shared day and joining shuts on it, so
 * both are ordered by that date — what's about to close first. The slider
 * is the whole joinable list, so there's no separate page for it; everything else — rounds under way or finished —
 * lives behind the topic tiles and search.
 *
 * The title row is the scroll's fixed header: search and "+" stay put while
 * the page moves under them, so neither ever floats over a cover.
 */
export default function DiscoverScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { currentDay, totalDays } = useApp();
  const cards = useChallengeCards();
  const [slide, setSlide] = useState(0);

  const coverWidth = width - layout.gutter * 2;
  const tileWidth = (coverWidth - layout.stack) / 2;

  const mine = cards.find((card) => card.mine);
  const upcoming = useMemo(
    () =>
      cards
        .filter((card) => card.phase === 'upcoming' && !card.mine)
        .sort((a, b) => (a.start?.getTime() ?? 0) - (b.start?.getTime() ?? 0)),
    [cards],
  );
  const [cover, ...soon] = upcoming;
  // Each row is the column's full width, with a gutter's worth of gap either
  // side of it, so the next one sits wholly off screen until it's swiped in.
  const slideStep = coverWidth + layout.gutter * 2;
  const onSlide = (event: NativeSyntheticEvent<NativeScrollEvent>) =>
    setSlide(Math.round(event.nativeEvent.contentOffset.x / slideStep));

  // One tile per topic that has anything in it, fronted by its first
  // challenge's first photo.
  const topics = useMemo(
    () =>
      CATEGORIES.map((name) => {
        const inIt = cards.filter((card) => card.category === name);
        return { name, count: inIt.length, photo: inIt[0]?.photos[0] };
      }).filter((topic) => topic.count > 0),
    [cards],
  );

  const openChallenge = (card: ChallengeCard) =>
    router.push({ pathname: '/feed/[id]', params: { id: card.id } });

  return (
    <ScreenScroll
      tabBar
      // The page ends on a line of small print rather than a card, and at
      // the bare tab-bar allowance it sat right on the bar's top edge.
      bottomExtra={layout.section}
      header={
        <ScreenHeader
          plainTitle="Challenges"
          showBack={false}
          right={
            <>
              <IconButton
                name="search"
                size={cornerButtonSize}
                iconSize={cornerIconSize}
                background={colors.surface}
                onPress={() => router.push('/challenges/search')}
                accessibilityLabel="Search challenges"
              />
              <IconButton
                name="add"
                size={cornerButtonSize}
                iconSize={cornerIconSize}
                background={colors.surface}
                onPress={() => router.push('/challenge/create')}
                accessibilityLabel="Create a challenge"
              />
            </>
          }
        />
      }
    >
      {mine ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`You're in ${mine.title}, day ${currentDay} of ${totalDays}`}
          onPress={() => router.push('/tasks')}
          style={({ pressed }) => [styles.mine, pressed && styles.pressed]}
        >
          <Image source={mine.photos[0]} style={styles.mineThumb} contentFit="cover" />
          <View style={styles.mineText}>
            <Text variant="badge" color={colors.inkMuted}>
              YOU'RE IN
            </Text>
            <Text variant="copyBold" numberOfLines={1}>
              {mine.title}
            </Text>
          </View>
          <Text variant="metaBold">
            Day {currentDay}
            <Text variant="metaBold" color={colors.inkMuted}>
              {' '}/ {totalDays}
            </Text>
          </Text>
        </Pressable>
      ) : null}

      {cover ? (
        <View style={styles.section}>
          <Cover card={cover} width={coverWidth} onPress={() => openChallenge(cover)} />
        </View>
      ) : null}

      {soon.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.heading}>
            <Text variant="sectionHeading">Starting soon</Text>
          </View>
          {/* Run to the screen edges so a row sliding in isn't clipped at the
              gutter, and snapped a row at a time so each swipe lands the
              next one exactly where the last one sat. */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={slideStep}
            decelerationRate="fast"
            onScroll={onSlide}
            scrollEventThrottle={16}
            contentContainerStyle={styles.slider}
            style={styles.sliderBleed}
          >
            {soon.map((card) => (
              <ChallengeRow
                key={card.id}
                card={card}
                showDate={false}
                detail={[card.statusLabel, card.category, `${card.days} days`]
                  .filter(Boolean)
                  .join(' · ')}
                onPress={() => openChallenge(card)}
                style={{ width: coverWidth }}
              />
            ))}
          </ScrollView>
          {soon.length > 1 ? (
            <View style={styles.dots}>
              {soon.map((card, i) => (
                <View key={card.id} style={[styles.dot, i === slide && styles.dotActive]} />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.heading}>
          <Text variant="sectionHeading">Browse by topic</Text>
        </View>
        <View style={styles.tiles}>
          {topics.map((topic) => (
            <Pressable
              key={topic.name}
              accessibilityRole="button"
              accessibilityLabel={`${topic.name}, ${topic.count} challenges`}
              onPress={() =>
                router.push({ pathname: '/challenges/[filter]', params: { filter: topic.name } })
              }
              style={({ pressed }) => [styles.tile, { width: tileWidth }, pressed && styles.pressed]}
            >
              {topic.photo ? (
                <Image source={topic.photo} style={absoluteFill} contentFit="cover" />
              ) : null}
              <View style={styles.tileScrim} />
              <Text variant="itemTitle" color={colors.inkInverse}>
                {topic.name}
              </Text>
              <Text variant="metaBold" color={colors.inkInverse}>
                {topic.count === 1 ? '1 challenge' : `${topic.count} challenges`}
              </Text>
            </Pressable>
          ))}
          {/* The last tile is the way into everything at once — every round
              in every phase, where the slider is only the ones you can still
              join. Drawn as a plain fill so it reads as "the rest", not as
              one more topic. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`All topics, ${cards.length} challenges`}
            onPress={() =>
              router.push({ pathname: '/challenges/[filter]', params: { filter: 'all' } })
            }
            style={({ pressed }) => [
              styles.tile,
              styles.tileAll,
              { width: tileWidth },
              pressed && styles.pressed,
            ]}
          >
            <Text variant="itemTitle">All topics</Text>
            <Text variant="metaBold" color={colors.inkMuted}>
              {cards.length === 1 ? '1 challenge' : `${cards.length} challenges`}
            </Text>
          </Pressable>
        </View>
      </View>

      <Text variant="copy" color={colors.inkMuted} center>
        Everyone in a challenge starts on the same day.{'\n'}Can't find one you like?{' '}
        <Text
          variant="copyBold"
          accessibilityRole="link"
          onPress={() => router.push('/challenge/create')}
        >
          Create your own
        </Text>
      </Text>
    </ScreenScroll>
  );
}

/**
 * One round you can still join, as a cover: its first photo edge to edge,
 * how long until it starts on a pill at the top, and over the shade at its
 * foot the topic and dates, the name, what a day asks of you, who's in, and
 * Join — everything needed to decide without opening it.
 */
function Cover({
  card,
  width,
  onPress,
}: {
  card: ChallengeCard;
  width: number;
  onPress: () => void;
}) {
  const others = Math.max((card.members ?? 0) - COVER_FACES.length, 0);
  const dates = card.start
    ? `${longDate(card.start)} → ${longDate(addDays(card.start, card.days - 1))}`
    : undefined;
  const kicker = [card.category, dates].filter(Boolean).join(' · ').toUpperCase();
  const tasks = card.tasks.map((task) => task.toLowerCase()).join(', ');
  const perDay = card.tasksCount === 1 ? '1 photo task a day' : `${card.tasksCount} photo tasks a day`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${card.title}, ${card.statusLabel}`}
      onPress={onPress}
      style={({ pressed }) => [styles.cover, { width }, pressed && styles.pressed]}
    >
      <Image source={card.photos[0]} style={absoluteFill} contentFit="cover" />
      <LinearGradient colors={gradients.coverShade} style={absoluteFill} />
      <Pill label={card.statusLabel} tone="floating" size="sm" bold style={styles.coverStatus} />
      <View style={styles.coverText}>
        <Text variant="badge" color={colors.onMediaSoft}>
          {kicker}
        </Text>
        <Text variant="title" color={colors.inkInverse} numberOfLines={2}>
          {card.title}
        </Text>
        <Text variant="copy" color={colors.onMediaSoft} numberOfLines={2}>
          {card.days} days · {perDay}: {tasks}
        </Text>
        <View style={styles.coverFoot}>
          {card.members !== undefined ? (
            <View style={styles.coverFaces}>
              <View style={styles.faceStack}>
                {COVER_FACES.map((friend, i) => (
                  <Avatar
                    key={friend.id}
                    source={friend.avatar}
                    size={COVER_FACE_SIZE}
                    style={[styles.face, i > 0 && styles.faceOverlap]}
                  />
                ))}
              </View>
              <Text variant="meta" color={colors.inkInverse} numberOfLines={1}>
                {COVER_FACES.map((friend) => friend.name).join(', ')} +
                {others.toLocaleString('en-US')}
              </Text>
            </View>
          ) : (
            <View />
          )}
          {/* Drawn as a button but not one of its own: the whole cover is
              the tap, and a button inside a button splits it in two. */}
          <Pill label="Join" tone="floating" size="lg" bold labelVariant="copyBold" />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: layout.section,
  },
  mine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.inline,
    padding: layout.inline,
    paddingRight: layout.block,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceSunken,
    marginBottom: layout.section,
  },
  mineThumb: {
    width: MINE_THUMB,
    height: MINE_THUMB,
    borderRadius: radii.sm,
  },
  mineText: {
    flex: 1,
  },
  cover: {
    height: COVER_HEIGHT,
    borderRadius: radii.xl,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  coverStatus: {
    position: 'absolute',
    top: layout.card,
    left: layout.card,
  },
  coverText: {
    padding: layout.card,
    gap: layout.stack,
  },
  coverFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: layout.inline,
    marginTop: layout.line,
  },
  coverFaces: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.stack,
  },
  faceStack: {
    flexDirection: 'row',
  },
  face: {
    borderWidth: 2,
    borderColor: colors.surface,
  },
  faceOverlap: {
    marginLeft: -spacing.sm,
  },
  sliderBleed: {
    marginHorizontal: -layout.gutter,
  },
  slider: {
    paddingHorizontal: layout.gutter,
    gap: layout.gutter * 2,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: DOT,
    marginTop: layout.stack,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: radii.pill,
    backgroundColor: colors.inkGhost,
  },
  dotActive: {
    width: DOT_ACTIVE,
    backgroundColor: colors.ink,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: layout.heading,
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: layout.stack,
  },
  tile: {
    height: TILE_HEIGHT,
    borderRadius: radii.lg,
    overflow: 'hidden',
    padding: layout.block,
    justifyContent: 'space-between',
  },
  tileAll: {
    backgroundColor: colors.surfaceSunken,
  },
  tileScrim: {
    ...absoluteFill,
    // The heavier of the photo scrims: a tile's type sits on whatever part
    // of the shot the crop lands on, often its brightest.
    backgroundColor: colors.scrim,
  },
  pressed: {
    opacity: 0.85,
  },
});
