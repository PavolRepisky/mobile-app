import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { IconButton, cornerButtonSize, cornerIconSize } from '@/components/IconButton';
import { Pill } from '@/components/Pill';
import { ScreenScroll } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Text } from '@/components/Text';
import { absoluteFill, colors, gradients, layout, radii, shadows, spacing } from '@/constants/theme';
import { useApp } from '@/hooks/useAppState';
import { CATEGORIES, useChallengeCards, type ChallengeCard } from '@/hooks/useChallengeCards';
import { addDays, longDate } from '@/lib/format';

/** Tall enough that the cover is the page's one picture — it carries the
 * whole pitch, dates to Join — and still leaves "Starting soon" peeking
 * under it on a standard phone. */
const COVER_HEIGHT = 420;
/** A topic tile: a name and a count over a photo, not a card to read. */
const TILE_HEIGHT = 104;
/** How many of your friends a cover names, by face and first name. */
const COVER_FRIENDS = 2;
const COVER_FACE_SIZE = 24;
/** The thumbnail on "You're in", a step smaller than a list row's. */
const MINE_THUMB = 44;
/** A Starting soon card: portrait, so a row of them reads as a shelf of
 * posters — two and the edge of a third across a phone, saying it scrolls. */
const SOON_WIDTH = 156;
const SOON_HEIGHT = 216;

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/**
 * Challenges. From the top: the one you're in, the soonest round you can
 * still join as a cover, every other one you can join as a row of photo
 * cards under it — See all opens the whole joinable list — and a tile per
 * topic. Every round starts on one shared day and joining shuts on it, so
 * both are ordered by that date — what's about to close first. Rounds under
 * way or finished live behind the topic tiles and search.
 *
 * The title row is the scroll's fixed header: search and "+" stay put while
 * the page moves under them, so neither ever floats over a cover.
 */
export default function DiscoverScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { currentDay, totalDays } = useApp();
  const cards = useChallengeCards();

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
            {/* Every round you can still join — the All topics page opens on
                starting soon. */}
            <Text
              variant="metaBold"
              color={colors.inkMuted}
              accessibilityRole="link"
              onPress={() =>
                router.push({ pathname: '/challenges/[filter]', params: { filter: 'all' } })
              }
            >
              See all {upcoming.length}
            </Text>
          </View>
          {/* Run to the screen edges, so a card scrolls in from under the edge
              rather than stopping short at the gutter. */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.soonRow}
            style={styles.soonBleed}
          >
            {soon.map((card) => (
              <SoonCard key={card.id} card={card} onPress={() => openChallenge(card)} />
            ))}
          </ScrollView>
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
              in every phase, where Starting soon is only the ones you can still
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
  // Your friends in it lead the line, by face and name; with none, how many
  // are in it at all — or, with nobody yet, that the first spot is open.
  const friends = card.friendsIn.slice(0, COVER_FRIENDS);
  const members = card.members ?? 0;
  const others = Math.max(members - friends.length, 0);
  const whoLine = friends.length
    ? `${friends.map((friend) => friend.name).join(', ')}${others ? ` + ${others.toLocaleString('en-US')}` : ''}`
    : members
      ? `${members.toLocaleString('en-US')} in it`
      : 'Be the first to join';
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
          <View style={styles.coverFaces}>
            {friends.length ? (
              <View style={styles.faceStack}>
                {friends.map((friend, i) => (
                  <Avatar
                    key={friend.id}
                    source={friend.avatar}
                    size={COVER_FACE_SIZE}
                    style={[styles.face, i > 0 && styles.faceOverlap]}
                  />
                ))}
              </View>
            ) : null}
            <Text variant="meta" color={colors.inkInverse} numberOfLines={1}>
              {whoLine}
            </Text>
          </View>
          {/* Drawn as a button but not one of its own: the whole cover is
              the tap, and a button inside a button splits it in two. */}
          <Pill label="Join" tone="floating" size="lg" bold labelVariant="copyBold" />
        </View>
      </View>
    </Pressable>
  );
}

/**
 * One more round you can join, as a small poster: its first photo, the day it
 * starts on a white pill at the top, and its name with how long it runs and
 * what a day asks over the shade at its foot.
 */
function SoonCard({ card, onPress }: { card: ChallengeCard; onPress: () => void }) {
  const starts = card.start ? `${WEEKDAYS[card.start.getDay()]} ${card.start.getDate()}` : null;
  const perDay = card.tasksCount === 1 ? '1 task' : `${card.tasksCount} tasks`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${card.title}, ${card.statusLabel}`}
      onPress={onPress}
      style={({ pressed }) => [styles.soonCard, pressed && styles.pressed]}
    >
      <View style={styles.soonClip}>
        <Image source={card.photos[0]} style={absoluteFill} contentFit="cover" />
        <LinearGradient colors={gradients.coverShade} style={absoluteFill} />
        {starts ? (
          <Pill label={starts} tone="floating" size="sm" bold style={styles.soonDate} />
        ) : null}
        <View style={styles.soonText}>
          <Text variant="copyBold" color={colors.inkInverse} numberOfLines={2}>
            {card.title}
          </Text>
          <Text variant="badge" color={colors.onMediaSoft}>
            {card.days} days · {perDay}
          </Text>
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
  // Pulled back out by the row's own top and bottom padding, so the cards
  // keep the heading's usual gap.
  soonBleed: {
    marginHorizontal: -layout.gutter,
    marginVertical: -layout.stack,
  },
  // Room above and below for the cards' shadows, which a horizontal scroll
  // would otherwise clip.
  soonRow: {
    paddingHorizontal: layout.gutter,
    paddingVertical: layout.stack,
    gap: layout.stack,
  },
  // A photo tile's soft shadow, on an outer box: the clipped one inside would
  // cut it off.
  soonCard: {
    width: SOON_WIDTH,
    height: SOON_HEIGHT,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceSunken,
    ...shadows.soft,
  },
  soonClip: {
    flex: 1,
    borderRadius: radii.lg,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  soonDate: {
    position: 'absolute',
    top: layout.heading,
    left: layout.heading,
  },
  soonText: {
    padding: layout.heading,
    gap: layout.line,
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
