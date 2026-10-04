import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ChallengeRow, challengeDetail } from '@/components/ChallengeRow';
import { EmptyState } from '@/components/EmptyState';
import { Pill } from '@/components/Pill';
import { ScreenScroll } from '@/components/Screen';
import { SearchBar } from '@/components/SearchBar';
import { Text } from '@/components/Text';
import { colors, layout, spacing } from '@/constants/theme';
import {
  CATEGORIES,
  LENGTHS,
  lengthBucket,
  matchedTask,
  matchesQuery,
  useChallengeCards,
  useCreatedChallengeCards,
  type ChallengeCard,
  type LengthBucket,
  type Phase,
} from '@/hooks/useChallengeCards';

/** A recent search's row: a comfortable tap, and three of them still read as
 * a short list rather than a menu. */
const RECENT_HEIGHT = 48;
const MAX_RECENT = 5;
/** Your own challenges shown before anything is typed — enough to reach the
 * one you just made; See all filters down to every one. */
const CREATED_PREVIEW = 3;
/** Joinable rounds first, then the ones already running, then the finished. */
const PHASE_ORDER: Record<Phase, number> = { upcoming: 0, active: 1, finished: 2 };

/**
 * What you've searched for recently, kept for as long as the app is open —
 * enough to step back into a search you just left, without a record of
 * searches outliving the session.
 */
let recentSearches: string[] = [];

/**
 * Search, opened from the Challenges tab's corner. Before anything is typed
 * it offers ways in without typing: recent searches, a chip per topic, and
 * the three lengths. A query matches names, topics and tasks, so "walk"
 * finds the rounds that have you walking and says which task it found. The
 * rounds you can join come first; the rest say they're closed. Nothing
 * found offers to start that challenge yourself. The challenges you've built
 * are searched too, and filtered to on their own with Created by you; each
 * opens on its page like any other, where its ⋯ edits or deletes it.
 */
export default function ChallengeSearchScreen() {
  const router = useRouter();
  const listed = useChallengeCards();
  const created = useCreatedChallengeCards();
  // Yours are in the listings too; Created by you's copy replaces that
  // entry, so each shows once and as something you made.
  const cards = useMemo(
    () => [...listed.filter((card) => !created.some((c) => c.id === card.id)), ...created],
    [listed, created],
  );
  const [query, setQuery] = useState('');
  const [length, setLength] = useState<LengthBucket>();
  const [ownOnly, setOwnOnly] = useState(false);
  const [recent, setRecent] = useState(recentSearches);

  const remember = (text: string) => {
    const q = text.trim();
    if (!q) return;
    recentSearches = [q, ...recentSearches.filter((r) => r !== q)].slice(0, MAX_RECENT);
    setRecent(recentSearches);
  };
  const forget = (text: string) => {
    recentSearches = recentSearches.filter((r) => r !== text);
    setRecent(recentSearches);
  };

  const topics = CATEGORIES.map((name) => ({
    name,
    // Counted off what each topic's page lists — yours included.
    count: listed.filter((card) => card.category === name).length,
  })).filter((t) => t.count > 0);

  const searching = query.trim().length > 0 || length !== undefined || ownOnly;
  const results = useMemo(
    () =>
      cards
        .filter(
          (card) =>
            matchesQuery(card, query) &&
            (!length || lengthBucket(card.days) === length) &&
            (!ownOnly || card.createdByMe),
        )
        .sort(
          (a, b) =>
            PHASE_ORDER[a.phase] - PHASE_ORDER[b.phase] ||
            (a.start?.getTime() ?? 0) - (b.start?.getTime() ?? 0),
        ),
    [cards, query, length, ownOnly],
  );
  const joinable = results.filter((card) => card.phase === 'upcoming' && !card.mine).length;
  const editable = results.filter((card) => card.createdByMe && card.phase === 'upcoming').length;

  const open = (card: ChallengeCard) => () => {
    remember(query);
    router.push({ pathname: '/feed/[id]', params: { id: card.id } });
  };

  const detailFor = (card: ChallengeCard) =>
    card.phase === 'upcoming'
      ? [card.category, `${card.days} days`].filter(Boolean).join(' · ')
      : challengeDetail(card, false);

  const openTopic = (name: string) =>
    router.push({ pathname: '/challenges/[filter]', params: { filter: name } });

  const topicChips = (
    <View style={styles.chips}>
      {topics.map((t) => (
        <Pill
          key={t.name}
          label={`${t.name} ${t.count}`}
          tone="muted"
          labelVariant="metaBold"
          style={styles.chip}
          onPress={() => openTopic(t.name)}
        />
      ))}
    </View>
  );

  return (
    <ScreenScroll
      header={
        <View style={styles.bar}>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder="Name, topic or task"
            autoFocus
            tone="sunken"
            onSubmit={() => remember(query)}
            rightIcon={query ? 'close' : undefined}
            onRightIconPress={() => setQuery('')}
            style={styles.field}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            hitSlop={spacing.sm}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Text variant="copyBold">Cancel</Text>
          </Pressable>
        </View>
      }
    >
      {!searching ? (
        <>
          {created.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.labelRow}>
                <Text variant="metaBold" color={colors.inkMuted}>
                  CREATED BY YOU
                </Text>
                {created.length > CREATED_PREVIEW ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setOwnOnly(true)}
                    hitSlop={spacing.sm}
                    style={({ pressed }) => pressed && styles.pressed}
                  >
                    <Text variant="metaBold">See all {created.length}</Text>
                  </Pressable>
                ) : null}
              </View>
              {created.slice(0, CREATED_PREVIEW).map((card) => (
                <ChallengeRow
                  key={card.id}
                  card={card}
                  detail={detailFor(card)}
                  onPress={open(card)}
                />
              ))}
            </View>
          ) : null}

          {recent.length > 0 ? (
            <View style={styles.section}>
              <Text variant="metaBold" color={colors.inkMuted}>
                RECENT
              </Text>
              {recent.map((r) => (
                <View key={r} style={styles.recent}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setQuery(r)}
                    style={({ pressed }) => [styles.recentTap, pressed && styles.pressed]}
                  >
                    <Ionicons name="time-outline" size={18} color={colors.inkMuted} />
                    <Text variant="copy" style={styles.recentText} numberOfLines={1}>
                      {r}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${r}`}
                    onPress={() => forget(r)}
                    hitSlop={spacing.sm}
                  >
                    <Ionicons name="close" size={16} color={colors.inkMuted} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.section}>
            <Text variant="metaBold" color={colors.inkMuted} style={styles.label}>
              TOPICS
            </Text>
            {topicChips}
          </View>

          <View style={styles.section}>
            <Text variant="metaBold" color={colors.inkMuted} style={styles.label}>
              HOW LONG
            </Text>
            <View style={styles.chips}>
              {LENGTHS.map((l) => (
                <Pill
                  key={l.key}
                  label={l.label}
                  tone="muted"
                  labelVariant="metaBold"
                  style={styles.chip}
                  onPress={() => setLength(l.key)}
                />
              ))}
            </View>
          </View>
        </>
      ) : results.length === 0 ? (
        <>
          <EmptyState
            icon="search"
            disc
            title={
              query.trim()
                ? ownOnly
                  ? `None of yours match "${query.trim()}"`
                  : `No challenges match "${query.trim()}"`
                : 'No challenges that long'
            }
            hint="Try a topic, or start this one yourself — friends can join on the day it begins."
            action={{
              label: query.trim() ? `Create "${query.trim()}"` : 'Create a challenge',
              onPress: () => router.push('/challenge/create'),
            }}
            style={styles.empty}
          />
          <View style={[styles.chips, styles.centred]}>
            {topics.map((t) => (
              <Pill
                key={t.name}
                label={t.name}
                tone="muted"
                labelVariant="metaBold"
                style={styles.chip}
                onPress={() => openTopic(t.name)}
              />
            ))}
          </View>
        </>
      ) : (
        <>
          <View style={styles.summary}>
            {ownOnly ? (
              <Pill
                label="Created by you"
                tone="solid"
                size="sm"
                bold
                trailingIcon="close"
                onPress={() => setOwnOnly(false)}
              />
            ) : null}
            {length ? (
              <Pill
                label={LENGTHS.find((l) => l.key === length)?.label ?? ''}
                tone="solid"
                size="sm"
                bold
                trailingIcon="close"
                onPress={() => setLength(undefined)}
              />
            ) : null}
            <Text variant="metaBold" color={colors.inkMuted}>
              {results.length === 1 ? '1 CHALLENGE' : `${results.length} CHALLENGES`} ·{' '}
              {ownOnly ? `${editable} YOU CAN EDIT` : `${joinable} YOU CAN JOIN`}
            </Text>
          </View>
          {results.map((card) => {
            const task = matchedTask(card, query);
            return (
              <ChallengeRow
                key={card.id}
                card={card}
                detail={detailFor(card)}
                note={task ? `Task: ${task.toLowerCase()}` : undefined}
                onPress={open(card)}
              />
            );
          })}
        </>
      )}
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.inline,
  },
  field: {
    flex: 1,
  },
  section: {
    marginBottom: layout.section,
  },
  label: {
    marginBottom: layout.heading,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recent: {
    height: RECENT_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.inline,
  },
  recentTap: {
    flex: 1,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.inline,
  },
  recentText: {
    flex: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: layout.stack,
  },
  centred: {
    justifyContent: 'center',
    marginTop: layout.section,
  },
  // The palette's fill rather than the warm `muted` pill, matching the
  // search field above it.
  chip: {
    backgroundColor: colors.surfaceSunken,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.stack,
    marginBottom: layout.stack,
  },
  empty: {
    paddingTop: spacing['4xl'],
  },
  pressed: {
    opacity: 0.85,
  },
});
