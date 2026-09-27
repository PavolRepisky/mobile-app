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
import {
  profileActionButton,
  profileActionIcon,
  profileActionTop,
} from '@/components/ProfileLayout';
import { ScreenScroll, topPadding } from '@/components/Screen';
import { SearchBar } from '@/components/SearchBar';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { Text } from '@/components/Text';
import { bodyTracking, colors, layout, radii, spacing } from '@/constants/theme';
import { challengeById, type ChallengeCategory } from '@/data/challenges';
import { challengeStrip, DISCOVER, FRIENDS } from '@/data/content';
import { useApp } from '@/hooks/useAppState';
import { localDay, roundState } from '@/lib/round';

/** The photo band across the top of each card — kept short so a card is a
 * row to scan past rather than a page to scroll through. */
const CARD_PHOTO_HEIGHT = 156;

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
  /** How many days the challenge runs, shown under its name. */
  days: number;
  /**
   * Where it stands, on the white badge in the photo's top-right corner:
   * "in 4 days" before a round starts, "Day 25 of 75" while it runs,
   * "Finished" after — and "N days left" on a custom challenge of your own,
   * which has no shared round to count from.
   */
  statusLabel: string;
  /** Which of the three tabs the card sits under. */
  phase: Phase;
}

/**
 * The list is split by where each round stands, because what someone is
 * looking for depends on it: a round they can still join, one under way, or
 * one that's over. Starting soon comes first — it's the only kind anyone can
 * join.
 */
type Phase = 'upcoming' | 'active' | 'finished';

const PHASES: readonly { key: Phase; label: string }[] = [
  { key: 'upcoming', label: 'Starting soon' },
  { key: 'active', label: 'Active' },
  { key: 'finished', label: 'Finished' },
];

/** What an empty tab says when no search or category is narrowing it. */
const EMPTY: Record<Phase, { title: string; hint: string }> = {
  upcoming: {
    title: 'Nothing starting soon',
    hint: 'Start your own with the + button.',
  },
  active: { title: 'No active challenges', hint: 'Join one that starts soon.' },
  finished: { title: 'No finished challenges yet', hint: 'Check back when one ends.' },
};

/** Faces in each card's who's-in stack — as many friends as there are, up
 * to three; everyone else is counted beside them. */
const CARD_FACES = FRIENDS.slice(0, 3);

/** A round's tab and its corner badge, off where it stands today. */
function roundStatus(startDate: string, days: number): { phase: Phase; label: string } {
  const state = roundState(localDay(startDate), days);
  if (state.kind === 'upcoming') {
    return {
      phase: 'upcoming',
      label:
        state.daysUntil === 1 ? 'Starts tomorrow' : `Starts in ${state.daysUntil} days`,
    };
  }
  if (state.kind === 'running') {
    return { phase: 'active', label: `Day ${state.day} of ${days}` };
  }
  return { phase: 'finished', label: 'Finished' };
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
  const [phase, setPhase] = useState<Phase>('upcoming');

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
    const listing = DISCOVER.find((section) => section.id === challenge.id);
    // Filed by its listing's round like every other card, so a round that has
    // ended sits under Finished even while it's the one you're on. A custom
    // challenge has no listing, so it counts from the day you started it.
    const mineStatus = listing
      ? roundStatus(listing.startDate, totalDays)
      : { phase: 'active' as const, label: `${daysLeft} days left` };
    const mine: ChallengeCard = {
      id: challenge.id,
      title: challenge.name,
      photos: challengeStrip(challenge.id),
      category: challenge.category,
      tasksCount: tasks.length,
      members: listing?.members,
      days: totalDays,
      statusLabel: mineStatus.label,
      phase: mineStatus.phase,
    };

    const browse: ChallengeCard[] = DISCOVER.filter(
      (section) => section.id !== challenge.id,
    ).map((section) => {
      const info = challengeById(section.id);
      const status = roundStatus(section.startDate, info.defaultDays);
      return {
        id: section.id,
        title: section.title,
        photos: section.photos,
        category: info.category,
        tasksCount: info.tasks.length,
        members: section.members,
        days: info.defaultDays,
        statusLabel: status.label,
        phase: status.phase,
      };
    });

    return [mine, ...browse];
  }, [challenge, tasks.length, currentDay, totalDays]);

  const filteredCards = useMemo(() => {
    // Split into terms so "excuses no" still finds "No Excuses Challenge" —
    // each word has to appear somewhere in the title, in any order.
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return cards.filter((card) => {
      if (card.phase !== phase) return false;
      if (category !== 'All' && card.category !== category) return false;
      if (terms.length === 0) return true;
      const title = card.title.toLowerCase();
      return terms.every((term) => title.includes(term));
    });
  }, [cards, query, category, phase]);

  return (
    // Absolute overlays need a positioned parent, otherwise their offsets
    // resolve against the scroll content instead of the screen.
    <View style={styles.screenRoot}>
      <ScreenScroll tabBar bottomExtra={spacing.lg}>
        <View style={[styles.header, { marginTop: titleOffset }]}>
          <Text variant="pageTitle" center>
            Challenges
          </Text>
        </View>

        {/* Community's own tab switch, under the title the same way. */}
        <SegmentedTabs
          options={PHASES}
          value={phase}
          onChange={setPhase}
          align="fill"
          style={styles.tabs}
        />

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
            title={
              query.trim() || category !== 'All'
                ? 'No challenges found'
                : EMPTY[phase].title
            }
            hint={
              query.trim()
                ? 'Try a different search.'
                : category !== 'All'
                  ? 'Try a different category.'
                  : EMPTY[phase].hint
            }
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
                    <PhotoStrip photos={card.photos} height={CARD_PHOTO_HEIGHT} layout="flat" radius={0} />
                    {card.category ? (
                      <Pill
                        label={card.category}
                        tone="floating"
                        icon={icon}
                        size="sm"
                        bold
                        labelVariant="metaBold"
                        style={[styles.categoryBadge, styles.badgeFill]}
                      />
                    ) : null}
                    <Pill
                      label={card.statusLabel}
                      tone="floating"
                      size="sm"
                      bold
                      labelVariant="metaBold"
                      style={[styles.durationBadge, styles.badgeFill]}
                    />
                  </View>

                  {/* The name, then a line under it: its length and daily
                      tasks on the left, the faces of who's in and a count of
                      everyone else on the right. */}
                  <View style={styles.cardBody}>
                    <Text variant="itemTitle" numberOfLines={1}>
                      {card.title}
                    </Text>
                    <View style={styles.cardFacts}>
                      <Text
                        variant="metaBold"
                        color={colors.inkMuted}
                        numberOfLines={1}
                        style={styles.trackedEnd}
                      >
                        {card.days} days · {card.tasksCount} tasks
                      </Text>

                      {card.members !== undefined ? (
                        <View style={styles.cardMembers}>
                          <View style={styles.memberStack}>
                            {CARD_FACES.map((friend, i) => (
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
                          <Text
                            variant="metaBold"
                            color={colors.inkMuted}
                            style={styles.trackedEnd}
                          >
                            and{' '}
                            {Math.max(card.members - CARD_FACES.length, 0).toLocaleString('en-US')}{' '}
                            others
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScreenScroll>

      {/* My Profile's and Community's corner button — the same size, white
          disc and soft shadow — pinned to the title's line and measured from
          the screen edge rather than the scroll content. */}
      <IconButton
        name="add"
        size={profileActionButton}
        iconSize={profileActionIcon}
        background={colors.surface}
        onPress={() => router.push('/challenge/create')}
        accessibilityLabel="Create a challenge"
        style={[styles.cornerRight, { top: headerTop }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
  // Sized to the corner button, so the title centres on the same line as the
  // button pinned beside it — the way My Profile and Community line up theirs.
  header: {
    minHeight: profileActionButton,
    justifyContent: 'center',
    marginBottom: layout.title,
  },
  cornerRight: {
    position: 'absolute',
    right: layout.gutter,
  },
  tabs: {
    marginBottom: layout.section,
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
  durationBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
  },
  // Both corner badges in one material: the canvas's white badge, held
  // translucent so the photo underneath still shows through.
  badgeFill: {
    backgroundColor: colors.surfaceOnPhotoDim,
  },
  // A row's padding rather than a card's full `card` on every side: this is
  // a name and one line of facts under a photo, and the full inset stood it
  // up as a block of its own. No gap between the two: the name's own
  // leading already sets the facts line apart.
  cardBody: {
    paddingHorizontal: layout.card,
    paddingVertical: layout.block,
  },
  cardFacts: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: layout.inline,
  },
  // Tight, so the faces and the count read as one phrase: "(faces) and 160
  // others".
  // The type's negative tracking is applied after the last letter too, so
  // the text's box ends a point short of the glyph it holds — and native
  // clips a Text to its box, shaving the end off a bold "s". Handing that
  // point back as padding lets the last letter finish.
  trackedEnd: {
    paddingRight: -bodyTracking,
  },
  cardMembers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.line,
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
