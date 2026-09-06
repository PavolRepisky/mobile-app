import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import {
  profileActionHeight,
  profileActionTop,
} from '@/components/ProfileLayout';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { TrophyCard } from '@/components/TrophyCard';
import { colors, radii, screenPadding, spacing } from '@/constants/theme';
import { CHALLENGES } from '@/data/challenges';
import { TROPHIES } from '@/data/trophies';

/** Slice of the next card left showing on either side of the one centred. */
const CARD_PEEK = spacing['2xl'];
/** Air between one card and the next. */
const CARD_GAP = spacing.lg;

/**
 * Every finished challenge, one to a page: swipe through them the way you'd
 * flip through a stack of medals rather than scan a list of them. The next
 * card's edge stays in view on both sides so the deck reads as something you
 * pull through, not a single full-bleed slide.
 *
 * The row bleeds past the screen's own gutter — the same trick the profile's
 * joined-challenge strip uses — so the peek reaches all the way to the screen
 * edge instead of stopping at the page margin.
 *
 * Trophies is one tap off the Profile tab, so its back arrow sits on
 * `profileActionTop` — the exact line Profile's gear and To-do's pencil
 * already share — rather than the lower `ScreenHeader` band a sub-page like
 * Settings uses. Landing back on Profile should read as one corner control
 * carrying over, not two screens that nearly agree.
 */
export default function TrophiesScreen() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = windowWidth - CARD_PEEK * 2;
  const snapInterval = cardWidth + CARD_GAP;

  const [index, setIndex] = useState(0);
  const lastIndex = useRef(0);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / snapInterval);
    const clamped = Math.max(0, Math.min(TROPHIES.length - 1, next));
    if (clamped !== lastIndex.current) {
      lastIndex.current = clamped;
      setIndex(clamped);
    }
  };

  return (
    <View style={styles.screenRoot}>
      <Screen tone="warm">
        <View style={styles.headerSpacer} />

        {TROPHIES.length === 0 ? (
          <EmptyState
            icon="trophy"
            title="No trophies yet"
            hint="Finish a challenge and it lands here."
          />
        ) : (
          // Centred in whatever room is left under the header, rather than
          // stacked from the top — a lone trophy sitting up against the
          // corner buttons read as misplaced, not as a page still loading.
          <View style={styles.body}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={snapInterval}
              snapToAlignment="start"
              onScroll={onScroll}
              scrollEventThrottle={16}
              style={styles.deck}
              contentContainerStyle={{
                paddingHorizontal: CARD_PEEK,
                gap: CARD_GAP,
              }}
            >
              {TROPHIES.map((trophy) => {
                const challenge = CHALLENGES.find(
                  (c) => c.id === trophy.challengeId,
                );
                if (!challenge) return null;

                return (
                  <TrophyCard
                    key={trophy.id}
                    trophy={trophy}
                    challenge={challenge}
                    width={cardWidth}
                  />
                );
              })}
            </ScrollView>

            <View style={styles.dots}>
              {TROPHIES.map((trophy, i) => (
                <View
                  key={trophy.id}
                  style={[styles.dot, i === index && styles.dotActive]}
                />
              ))}
            </View>
          </View>
        )}
      </Screen>

      {/* Matches profile.tsx's own corner button exactly: placed from the
          display edge rather than from the scroll content. */}
      <View style={styles.topBar}>
        <Text variant="sectionTitle" center>
          Trophies
        </Text>
        <IconButton
          name="chevron-back"
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          style={styles.back}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
  headerSpacer: {
    height: profileActionTop + profileActionHeight,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
  },
  topBar: {
    position: 'absolute',
    top: profileActionTop,
    left: screenPadding,
    right: screenPadding,
    height: profileActionHeight,
    justifyContent: 'center',
  },
  back: {
    position: 'absolute',
    left: 0,
  },
  deck: {
    marginHorizontal: -screenPadding,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing['3xl'],
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: radii.pill,
    backgroundColor: colors.inkGhost,
  },
  dotActive: {
    width: 22,
    backgroundColor: colors.ink,
  },
});
