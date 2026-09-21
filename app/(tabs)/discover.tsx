import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { Pill } from '@/components/Pill';
import { PhotoStrip, type PhotoSource } from '@/components/PhotoStrip';
import { profileActionTop } from '@/components/ProfileLayout';
import { ScreenScroll, topPadding } from '@/components/Screen';
import { SearchBar } from '@/components/SearchBar';
import { Text } from '@/components/Text';
import { colors, radii, screenPadding, shadows, spacing } from '@/constants/theme';
import { challengeById, type ChallengeCategory } from '@/data/challenges';
import { challengeStrip, DISCOVER, FRIENDS } from '@/data/content';
import { useApp } from '@/hooks/useAppState';
import { memberCountLabel } from '@/lib/format';

/** Matches the "+" corner button's own size. */
const ADD_SIZE = 46;

/** The browse filters, "All" plus one per `ChallengeCategory`. */
const CATEGORIES = ['All', 'Fitness', 'Health', 'Mindset', 'Lifestyle', 'Study'] as const;
type CategoryFilter = (typeof CATEGORIES)[number];

/** Leading glyph for a category's pills, on and off the filter row. */
const CATEGORY_ICONS: Record<ChallengeCategory, keyof typeof Ionicons.glyphMap> = {
  Fitness: 'barbell',
  Health: 'heart',
  Mindset: 'leaf',
  Lifestyle: 'sunny',
  Study: 'book',
};

/** One row of the unified list — the challenge you're on and every browse
 * option render through the same card, so there is nothing to tell them
 * apart by shape. */
interface ChallengeCard {
  id: string;
  title: string;
  photos: readonly PhotoSource[];
  category?: ChallengeCategory;
  tasksCount: number;
  /** Undefined for a custom challenge with no Discover listing of its own —
   * the members row drops out rather than showing a count nothing backs. */
  members?: number;
  /** "N days left" for the one you're on, "N days" — its plain length — for
   * everything else, since only your own run has a "left" to speak of. */
  durationLabel: string;
}

/**
 * The challenges going on out there, one long list — the one you're on and
 * everything you could start sit in the same row shape, in the same scroll,
 * so nothing marks your own run out as a different kind of thing. Tapping any
 * of them opens its feed. The "+" is sticky, pinned to the same top-right
 * corner every other tab root puts its own action button in; the title
 * shares its line, the way the button's own fixed offset naturally lines the
 * two up.
 */
export default function DiscoverScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { challenge, tasks, currentDay, totalDays } = useApp();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('All');

  /**
   * The shared line the title and the button both sit on: normally the
   * button's own fixed offset, but on a deep safe-area inset (Dynamic Island,
   * a tall notch) the scroll's own top padding can run past it — in which
   * case the button drops to meet the content instead of the title
   * disappearing under a fixed corner.
   */
  const headerTop = Math.max(profileActionTop, topPadding(insets.top));
  const titleOffset = headerTop - topPadding(insets.top);

  // One row for the challenge you're on, built off live app state rather
  // than the static table — a custom challenge has no entry in `DISCOVER` or
  // `CHALLENGES` for `challengeById` to find — plus one row per browse
  // option, off the static table the way the picker itself reads it.
  const cards = useMemo<ChallengeCard[]>(() => {
    const daysLeft = Math.max(totalDays - currentDay, 0);
    const mine: ChallengeCard = {
      id: challenge.id,
      title: challenge.name,
      photos: challengeStrip(challenge.id),
      category: challenge.category,
      tasksCount: tasks.length,
      members: DISCOVER.find((section) => section.id === challenge.id)?.members,
      durationLabel: `${daysLeft} days left`,
    };

    const browse: ChallengeCard[] = DISCOVER.filter(
      (section) => section.id !== challenge.id,
    ).map((section) => {
      const info = challengeById(section.id);
      return {
        id: section.id,
        title: section.title,
        photos: section.photos,
        category: info.category,
        tasksCount: info.tasks.length,
        members: section.members,
        durationLabel: `${info.defaultDays} days`,
      };
    });

    return [mine, ...browse];
  }, [challenge, tasks.length, currentDay, totalDays]);

  const filteredCards = useMemo(() => {
    // Split into terms so "excuses no" still finds "No Excuses Challenge" —
    // each word has to appear somewhere in the title, in any order.
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return cards.filter((card) => {
      if (category !== 'All' && card.category !== category) return false;
      if (terms.length === 0) return true;
      const title = card.title.toLowerCase();
      return terms.every((term) => title.includes(term));
    });
  }, [cards, query, category]);

  return (
    // Absolute overlays need a positioned parent, otherwise their offsets
    // resolve against the scroll content instead of the screen.
    <View style={styles.screenRoot}>
      <ScreenScroll tabBar bottomExtra={spacing.lg}>
        <View style={[styles.header, { marginTop: titleOffset }]}>
          <Text variant="sectionTitle" center>
            Challenges
          </Text>
        </View>

        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Search challenges"
          style={styles.search}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryRow}
        >
          {CATEGORIES.map((cat) => {
            const active = cat === category;
            return (
              <Pill
                key={cat}
                label={cat}
                tone={active ? 'solid' : 'outline'}
                bold
                onPress={() => setCategory(cat)}
              />
            );
          })}
        </ScrollView>

        {filteredCards.length === 0 ? (
          <EmptyState
            icon="search"
            title="No challenges found"
            hint={query.trim() ? 'Try a different search.' : 'Try a different category.'}
            style={styles.empty}
          />
        ) : (
          <View style={styles.cards}>
            {filteredCards.map((card) => {
              const icon = card.category ? CATEGORY_ICONS[card.category] : 'sparkles';
              return (
                <Card
                  key={card.id}
                  padded={false}
                  radius={radii.md}
                  onPress={() =>
                    router.push({ pathname: '/feed/[id]', params: { id: card.id } })
                  }
                >
                  <View style={styles.cardPhotoWrap}>
                    <PhotoStrip photos={card.photos} height={196} layout="flat" radius={0} />
                    {card.category ? (
                      <Pill
                        label={card.category}
                        tone="solid"
                        icon={icon}
                        size="sm"
                        bold
                        style={[styles.categoryBadge, styles.categoryBadgeFill]}
                      />
                    ) : null}
                    <Pill
                      label={card.durationLabel}
                      tone="floating"
                      size="sm"
                      bold
                      style={[styles.durationBadge, styles.durationBadgeFill]}
                    />
                  </View>

                  <View style={styles.cardBody}>
                    <View style={styles.cardTitleColumn}>
                      <Text variant="sectionTitleXs" numberOfLines={1}>
                        {card.title}
                      </Text>
                      <Text variant="labelBold" color={colors.inkMuted}>
                        {card.tasksCount} tasks daily
                      </Text>
                    </View>

                    {card.members !== undefined ? (
                      <View style={styles.cardMembersRow}>
                        <View style={styles.memberStack}>
                          {FRIENDS.slice(0, 3).map((friend, i) => (
                            <Avatar
                              key={friend.id}
                              source={friend.avatar}
                              size={28}
                              style={[
                                styles.memberAvatar,
                                i > 0 && styles.memberAvatarOverlap,
                              ]}
                            />
                          ))}
                        </View>
                        <Text variant="labelBold" color={colors.inkMuted}>
                          {memberCountLabel(card.members)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScreenScroll>

      {/* Pinned to the same line as every other tab root's corner button,
          measured from the screen edge rather than from the scroll content. */}
      <IconButton
        name="add"
        size={ADD_SIZE}
        iconSize={20}
        background={colors.ink}
        color={colors.inkInverse}
        shadow={false}
        onPress={() => router.push('/challenge/create')}
        accessibilityLabel="Create a challenge"
        style={[styles.corner, { top: headerTop }, shadows.floating]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
  // Sized to its own text, exactly like Community's header, rather than
  // padded out to the corner button's own height and centred inside that —
  // the button's `top` already lines up with this row's own top edge via
  // `titleOffset`, so the extra box only pushed the title down without
  // buying any alignment.
  header: {
    minHeight: ADD_SIZE,
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  corner: {
    position: 'absolute',
    right: screenPadding,
  },
  search: {
    marginBottom: spacing.xl,
  },
  categoryScroll: {
    marginBottom: spacing['2xl'],
  },
  categoryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  cards: {
    gap: spacing['3xl'],
  },
  cardPhotoWrap: {
    position: 'relative',
  },
  categoryBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
  },
  // A translucent fill rather than the shared solid-tone pill: sitting
  // straight on the challenge photo, it reads as a flat block at full ink —
  // pulled back so the picture underneath still shows through.
  categoryBadgeFill: {
    backgroundColor: colors.inkOnPhoto,
  },
  durationBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
  },
  // Matches the category chip's own translucency, in white rather than ink.
  durationBadgeFill: {
    backgroundColor: colors.surfaceOnPhotoDim,
  },
  cardBody: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    // A shade under the top padding: with no progress row left to balance,
    // the full `xl` on both edges read as a gap left behind rather than a
    // deliberate one.
    paddingBottom: spacing.lg,
  },
  cardTitleColumn: {
    flex: 1,
  },
  cardMembersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  memberStack: {
    flexDirection: 'row',
  },
  memberAvatar: {
    borderWidth: 2,
    borderColor: colors.surface,
  },
  memberAvatarOverlap: {
    marginLeft: -10,
  },
  empty: {
    marginTop: spacing.xl,
  },
});
