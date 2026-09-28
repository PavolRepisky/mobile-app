import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChallengeRow, challengeDetail } from '@/components/ChallengeRow';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { profileActionButton, profileActionIcon } from '@/components/ProfileLayout';
import { headerLineTop, ScreenScroll, topPadding } from '@/components/Screen';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { Text } from '@/components/Text';
import { absoluteFill, colors, gradients, layout, spacing } from '@/constants/theme';
import type { ChallengeCategory } from '@/data/challenges';
import {
  CATEGORIES,
  CATEGORY_BLURBS,
  PHASES,
  useChallengeCards,
  type ChallengeCard,
  type Phase,
} from '@/hooks/useChallengeCards';

/** The topic's photo band: tall enough to hold the back button, the name and
 * its line, short enough that the first rows sit above the fold. */
const BAND_HEIGHT = 230;

/**
 * One topic — Fitness, Study — opened from its tile on the Challenges tab.
 * The topic's photo heads the page with its name and what it covers, then a
 * switch between rounds starting soon, under way and finished. It always
 * opens on starting soon, the only rounds anyone can join; when there are
 * none it says so, offers to start one, and lists what's under way below so
 * the page is never a dead end.
 *
 * The All topics tile opens it with no topic (`all`): the same page over
 * every challenge, each row naming its topic.
 */
export default function TopicScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { filter } = useLocalSearchParams<{ filter: string }>();
  const cards = useChallengeCards();
  const topic = CATEGORIES.find((name) => name === filter) as ChallengeCategory | undefined;
  const [phase, setPhase] = useState<Phase>('upcoming');

  const inTopic = useMemo(
    () => cards.filter((card) => !topic || card.category === topic),
    [cards, topic],
  );
  const byPhase = (p: Phase) =>
    inTopic
      .filter((card) => card.phase === p)
      .sort((a, b) =>
        p === 'upcoming'
          ? (a.start?.getTime() ?? 0) - (b.start?.getTime() ?? 0)
          : (b.start?.getTime() ?? 0) - (a.start?.getTime() ?? 0),
      );
  const rows = byPhase(phase);
  const name = topic ?? 'All challenges';
  const blurb = topic ? CATEGORY_BLURBS[topic] : 'Every topic, every round';

  const open = (card: ChallengeCard) =>
    router.push({ pathname: '/feed/[id]', params: { id: card.id } });

  const list = (items: readonly ChallengeCard[]) =>
    items.map((card) => (
      <ChallengeRow
        key={card.id}
        card={card}
        detail={challengeDetail(card, !topic)}
        onPress={() => open(card)}
      />
    ));

  const underWay = phase === 'upcoming' && rows.length === 0 ? byPhase('active') : [];

  return (
    <ScreenScroll padded={false} contentContainerStyle={styles.page}>
      <View style={styles.band}>
        {inTopic[0] ? (
          <Image source={inTopic[0].photos[0]} style={absoluteFill} contentFit="cover" />
        ) : null}
        <LinearGradient colors={gradients.coverShade} style={absoluteFill} />
        <IconButton
          name="chevron-back"
          size={profileActionButton}
          iconSize={profileActionIcon}
          background={colors.surface}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          style={[
            styles.back,
            { top: Math.max(headerLineTop, topPadding(insets.top)) },
          ]}
        />
        <View style={styles.bandText}>
          <Text variant="title" color={colors.inkInverse}>
            {name}
          </Text>
          <Text variant="meta" color={colors.onMediaSoft}>
            {blurb} · {inTopic.length === 1 ? '1 challenge' : `${inTopic.length} challenges`}
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        <SegmentedTabs
          variant="pill"
          dense
          options={PHASES.map((p) => ({ key: p.key, label: `${p.label} ${byPhase(p.key).length}` }))}
          value={phase}
          onChange={setPhase}
          style={styles.switch}
        />

        {rows.length > 0 ? (
          list(rows)
        ) : phase === 'upcoming' ? (
          <EmptyState
            icon="calendar-outline"
            disc
            title={topic ? `Nothing starting soon in ${topic}` : 'Nothing starting soon'}
            hint="New rounds open every week. Start one yourself and friends can join you."
            action={{
              label: topic ? `Create a ${topic} challenge` : 'Create a challenge',
              onPress: () => router.push('/challenge/create'),
            }}
            style={styles.empty}
          />
        ) : (
          <EmptyState
            icon={phase === 'active' ? 'hourglass-outline' : 'flag-outline'}
            disc
            title={
              phase === 'active'
                ? `Nothing under way${topic ? ` in ${topic}` : ''}`
                : `Nothing finished${topic ? ` in ${topic}` : ''} yet`
            }
            style={styles.empty}
          />
        )}

        {underWay.length > 0 ? (
          <>
            <Text variant="copyBold" style={styles.underWay}>
              Under way — closed to new members
            </Text>
            {list(underWay)}
          </>
        ) : null}
      </View>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  // The band runs up under the status bar, so the page starts at the top edge
  // rather than a title's gap below it.
  page: {
    paddingTop: 0,
  },
  band: {
    height: BAND_HEIGHT,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    backgroundColor: colors.surfaceSunken,
  },
  back: {
    position: 'absolute',
    left: layout.gutter,
  },
  bandText: {
    paddingHorizontal: layout.gutter,
    paddingBottom: layout.card,
    gap: layout.line,
  },
  body: {
    paddingHorizontal: layout.gutter,
    paddingTop: layout.card,
  },
  switch: {
    marginBottom: layout.stack,
  },
  empty: {
    paddingTop: spacing['2xl'],
  },
  underWay: {
    marginTop: layout.section,
    marginBottom: layout.line,
  },
});
