import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { Pill } from '@/components/Pill';
import { ScreenScroll } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SearchBar } from '@/components/SearchBar';
import { Text } from '@/components/Text';
import { colors, layout, radii } from '@/constants/theme';
import type { ChallengeCategory } from '@/data/challenges';
import {
  CATEGORIES,
  matchesQuery,
  PHASES,
  useChallengeCards,
  type Phase,
} from '@/hooks/useChallengeCards';

/** A row's photo: big enough to recognise a challenge by, small enough that
 * a screen holds seven of them. */
const THUMB = 56;

/**
 * The long list behind Challenges — every challenge, or one category's, as
 * compact rows under a search field and a chip per phase with its count. It
 * is where the catalogue's long tail lives, so the Challenges tab itself can
 * stay a cover and a handful of tiles however many rounds there are.
 */
export default function ChallengeListScreen() {
  const router = useRouter();
  const { filter, search } = useLocalSearchParams<{ filter: string; search?: string }>();
  const cards = useChallengeCards();
  const category = CATEGORIES.find((name) => name === filter) as ChallengeCategory | undefined;
  const [query, setQuery] = useState('');

  const inScope = useMemo(
    () => cards.filter((card) => !category || card.category === category),
    [cards, category],
  );
  const counts = useMemo(() => {
    const byPhase: Record<Phase, number> = { upcoming: 0, active: 0, finished: 0 };
    for (const card of inScope) {
      if (matchesQuery(card, query)) byPhase[card.phase] += 1;
    }
    return byPhase;
  }, [inScope, query]);

  // Opens on the rounds you can still join, unless there are none here.
  const [phase, setPhase] = useState<Phase>(
    () => PHASES.find((p) => inScope.some((card) => card.phase === p.key))?.key ?? 'upcoming',
  );

  const rows = useMemo(
    () =>
      inScope
        .filter((card) => card.phase === phase && matchesQuery(card, query))
        .sort((a, b) => (a.start?.getTime() ?? 0) - (b.start?.getTime() ?? 0)),
    [inScope, phase, query],
  );

  return (
    <ScreenScroll
      header={<ScreenHeader bar plainTitle={category ?? 'All challenges'} />}
    >
      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder={category ? `Search ${category.toLowerCase()}` : 'Search challenges'}
        autoFocus={search === '1'}
        style={styles.search}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsBleed}
        contentContainerStyle={styles.chips}
      >
        {PHASES.map((p) => (
          <Pill
            key={p.key}
            label={`${p.label} ${counts[p.key]}`}
            tone={p.key === phase ? 'solid' : 'muted'}
            bold
            onPress={() => setPhase(p.key)}
          />
        ))}
      </ScrollView>

      {rows.length === 0 ? (
        <EmptyState
          icon="search"
          title="No challenges found"
          hint={query.trim() ? 'Try a different search.' : 'Try another tab.'}
          style={styles.empty}
        />
      ) : (
        <View style={styles.rows}>
          {rows.map((card) => (
            <Pressable
              key={card.id}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/feed/[id]', params: { id: card.id } })}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <Image source={card.photos[0]} style={styles.thumb} contentFit="cover" />
              <View style={styles.rowText}>
                <Text variant="copyBold" numberOfLines={1}>
                  {card.title}
                </Text>
                <Text variant="meta" color={colors.inkMuted} numberOfLines={1}>
                  {[
                    card.category,
                    `${card.days} days`,
                    card.members !== undefined ? `${card.members.toLocaleString('en-US')} in` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              <Text variant="metaBold">{card.shortStatus}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  search: {
    marginBottom: layout.block,
  },
  // Chips run to the screen edges when they overflow, starting on the
  // gutter like everything above them.
  chipsBleed: {
    marginHorizontal: -layout.gutter,
    marginBottom: layout.section,
  },
  chips: {
    paddingHorizontal: layout.gutter,
    gap: layout.stack,
  },
  rows: {
    gap: layout.block,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.inline,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: radii.md,
  },
  rowText: {
    flex: 1,
    gap: layout.line,
  },
  empty: {
    marginTop: layout.section,
  },
  pressed: {
    opacity: 0.85,
  },
});
