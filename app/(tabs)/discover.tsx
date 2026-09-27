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
import { IconButton } from '@/components/IconButton';
import { profileActionButton, profileActionIcon } from '@/components/ProfileLayout';
import { ScreenScroll } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Text } from '@/components/Text';
import { absoluteFill, colors, gradients, layout, radii, spacing } from '@/constants/theme';
import { FRIENDS } from '@/data/content';
import { CATEGORIES, useChallengeCards, type ChallengeCard } from '@/hooks/useChallengeCards';
import { longDate } from '@/lib/format';

/** Tall enough for a photo to read as a cover rather than a thumbnail, short
 * enough that Browse starts above the fold. */
const COVER_HEIGHT = 260;
/** A category tile: a name and a count over a photo, not a card to read. */
const TILE_HEIGHT = 96;
/** The faces on a cover — the friends named in its line. */
const COVER_FACES = FRIENDS.slice(0, 2);
const COVER_FACE_SIZE = 24;
/** The pager's dots: the current one stretched into a short bar. */
const DOT = 6;
const DOT_ACTIVE = 18;

/**
 * Challenges, built to hold dozens of them: one cover at a time of what's
 * about to start — the only rounds anyone can still join — swiped through,
 * then Browse, one tile per category with how many it holds. Every tile,
 * "See all" and the search button open the same filtered list, where the
 * long tail lives; this page stays short however many challenges there are.
 *
 * The title row is the scroll's fixed header: search, title and "+" stay put
 * together while the page moves under them, so the "+" never floats over a
 * cover the way it did pinned beside a title that scrolled away.
 */
export default function DiscoverScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const cards = useChallengeCards();
  const [page, setPage] = useState(0);

  const coverWidth = width - layout.gutter * 2;
  const tileWidth = (coverWidth - layout.stack) / 2;

  // Soonest first. With nothing left to join, whatever is running stands in,
  // so the top of the page is never empty.
  const featured = useMemo(() => {
    const upcoming = cards
      .filter((card) => card.phase === 'upcoming')
      .sort((a, b) => (a.start?.getTime() ?? 0) - (b.start?.getTime() ?? 0));
    return upcoming.length > 0 ? upcoming : cards.filter((card) => card.phase === 'active');
  }, [cards]);

  // One tile per category that has anything in it, fronted by its first
  // challenge's first photo.
  const categories = useMemo(
    () =>
      CATEGORIES.map((name) => {
        const inIt = cards.filter((card) => card.category === name);
        return { name, count: inIt.length, photo: inIt[0]?.photos[0] };
      }).filter((category) => category.count > 0),
    [cards],
  );

  const openList = (filter: string, search?: boolean) =>
    router.push({
      pathname: '/challenges/[filter]',
      params: search ? { filter, search: '1' } : { filter },
    });

  const onPage = (event: NativeSyntheticEvent<NativeScrollEvent>) =>
    setPage(Math.round(event.nativeEvent.contentOffset.x / (coverWidth + layout.stack)));

  return (
    <ScreenScroll
      tabBar
      header={
        <ScreenHeader
          bar
          plainTitle="Challenges"
          left={
            <IconButton
              name="search"
              size={profileActionButton}
              iconSize={profileActionIcon}
              background={colors.surface}
              onPress={() => openList('all', true)}
              accessibilityLabel="Search challenges"
            />
          }
          right={
            <IconButton
              name="add"
              size={profileActionButton}
              iconSize={profileActionIcon}
              background={colors.surface}
              onPress={() => router.push('/challenge/create')}
              accessibilityLabel="Create a challenge"
            />
          }
        />
      }
    >
      {featured.length > 0 ? (
        <View style={styles.section}>
          {/* Pages the width of the gutter-inset column, the gap between
              them snapped past, so each swipe lands the next cover exactly
              where the last one sat. */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={coverWidth + layout.stack}
            decelerationRate="fast"
            onMomentumScrollEnd={onPage}
            contentContainerStyle={styles.pager}
            style={styles.pagerBleed}
          >
            {featured.map((card) => (
              <Cover
                key={card.id}
                card={card}
                width={coverWidth}
                onPress={() =>
                  router.push({ pathname: '/feed/[id]', params: { id: card.id } })
                }
              />
            ))}
          </ScrollView>
          {featured.length > 1 ? (
            <View style={styles.dots}>
              {featured.map((card, i) => (
                <View key={card.id} style={[styles.dot, i === page && styles.dotActive]} />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.heading}>
        <Text variant="sectionHeading">Browse</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => openList('all')}
          hitSlop={spacing.sm}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Text variant="metaBold" color={colors.inkMuted}>
            See all {cards.length}
          </Text>
        </Pressable>
      </View>

      <View style={styles.tiles}>
        {categories.map((category) => (
          <Pressable
            key={category.name}
            accessibilityRole="button"
            accessibilityLabel={`${category.name}, ${category.count} challenges`}
            onPress={() => openList(category.name)}
            style={({ pressed }) => [
              styles.tile,
              { width: tileWidth },
              pressed && styles.pressed,
            ]}
          >
            {category.photo ? (
              <Image source={category.photo} style={absoluteFill} contentFit="cover" />
            ) : null}
            <View style={styles.tileScrim} />
            <Text variant="itemTitle" color={colors.inkInverse}>
              {category.name}
            </Text>
            <Text variant="metaBold" color={colors.inkInverse}>
              {category.count === 1 ? '1 challenge' : `${category.count} challenges`}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScreenScroll>
  );
}

/** One featured round: its first photo edge to edge, and over the shade at
 * its foot when it starts, its name, and who's in. */
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
  const when =
    card.phase === 'upcoming' && card.start ? `Starts ${longDate(card.start)}` : card.statusLabel;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${card.title}, ${when}`}
      onPress={onPress}
      style={({ pressed }) => [styles.cover, { width }, pressed && styles.pressed]}
    >
      <Image source={card.photos[0]} style={absoluteFill} contentFit="cover" />
      <LinearGradient colors={gradients.coverShade} style={absoluteFill} />
      <View style={styles.coverText}>
        <Text variant="badge" color={colors.inkInverse}>
          {when}
        </Text>
        <Text variant="pageTitle" color={colors.inkInverse} numberOfLines={1}>
          {card.title}
        </Text>
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
            <Text variant="meta" color={colors.inkInverse}>
              {COVER_FACES.map((friend) => friend.name).join(', ')} and{' '}
              {others.toLocaleString('en-US')} more are in
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: layout.section,
  },
  // The pager runs to the screen edges, so a cover being swiped in isn't
  // clipped at the gutter; its content is inset back to the column.
  pagerBleed: {
    marginHorizontal: -layout.gutter,
  },
  pager: {
    paddingHorizontal: layout.gutter,
    gap: layout.stack,
  },
  cover: {
    height: COVER_HEIGHT,
    borderRadius: radii.xl,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  coverText: {
    padding: layout.card,
    gap: layout.line,
  },
  coverFaces: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.stack,
    marginTop: layout.line,
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
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: DOT,
    marginTop: layout.heading,
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
