import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { PhotoStrip } from '@/components/PhotoStrip';
import { profileActionTop } from '@/components/ProfileLayout';
import { ScreenScroll, topPadding } from '@/components/Screen';
import { SearchBar } from '@/components/SearchBar';
import { Text } from '@/components/Text';
import { colors, radii, screenPadding, shadows, spacing } from '@/constants/theme';
import { challengeById } from '@/data/challenges';
import { DISCOVER } from '@/data/content';
import { memberCountLabel } from '@/lib/format';

/** Matches the "+" corner button's own size. */
const ADD_SIZE = 46;

/**
 * The challenges going on out there, a photo strip each. Tapping one opens its
 * feed. Only the "+" is sticky, pinned to the same top-right corner every
 * other tab root puts its own action button in; the title scrolls away with
 * the rest of the page instead of riding along with it. The title is centred
 * and short enough that it never reaches the button's corner, so it sits at
 * the page's own normal top padding rather than ducking below the button.
 */
export default function DiscoverScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  /**
   * The shared line the title and the button both sit on: normally the
   * button's own fixed offset, but on a deep safe-area inset (Dynamic Island,
   * a tall notch) the scroll's own top padding can run past it — in which
   * case the button drops to meet the content instead of the title
   * disappearing under a fixed corner.
   */
  const headerTop = Math.max(profileActionTop, topPadding(insets.top));
  const titleOffset = headerTop - topPadding(insets.top);

  const sections = useMemo(() => {
    // Split into terms so "excuses no" still finds "No Excuses Challenge" —
    // each word has to appear somewhere in the title, in any order.
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return DISCOVER;
    return DISCOVER.filter((section) => {
      const title = section.title.toLowerCase();
      return terms.every((term) => title.includes(term));
    });
  }, [query]);

  return (
    // Absolute overlays need a positioned parent, otherwise their offsets
    // resolve against the scroll content instead of the screen.
    <View style={styles.screenRoot}>
      <ScreenScroll tabBar bottomExtra={spacing.lg}>
        {/* A band the same height as the "+" button, dropped to the button's
            own line — centring the text inside it is what lines the two up,
            rather than the two happening to agree. */}
        <View style={[styles.titleBand, { marginTop: titleOffset }]}>
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

        {sections.length === 0 ? (
          <EmptyState
            icon="search"
            title="No challenges found"
            hint="Try a different search."
          />
        ) : (
          <View style={styles.sections}>
            {sections.map((section) => {
              const challenge = challengeById(section.id);
              return (
              <Pressable
                key={section.id}
                accessibilityRole="button"
                accessibilityLabel={section.title}
                onPress={() => router.push({ pathname: '/feed/[id]', params: { id: section.id } })}
                style={styles.section}
              >
                {/* Set close above the strip — much closer than the gap to
                    the next challenge below — so proximity alone reads it as
                    this strip's own heading rather than a caption trailing
                    the one above. */}
                <Text variant="sectionTitleSm" style={styles.sectionTitle}>
                  {section.title}
                </Text>

                {/* Plain icon-and-text, not a pill: a fact sitting on the
                    page itself rather than a control or a badge. The dot
                    between them is the same solid circle the review pager's
                    own position dots use, not a character — a glyph dot sits
                    low and reads as a stray mark next to icon rows this size. */}
                <View style={styles.sectionMeta}>
                  <View style={styles.sectionMetaItem}>
                    <Ionicons name="calendar" size={14} color={colors.inkFaded} />
                    <Text variant="labelBold" color={colors.inkFaded}>
                      {challenge.defaultDays} days
                    </Text>
                  </View>
                  <View style={styles.sectionMetaDot} />
                  <View style={styles.sectionMetaItem}>
                    <Ionicons name="list" size={14} color={colors.inkFaded} />
                    <Text variant="labelBold" color={colors.inkFaded}>
                      {challenge.tasks.length} tasks
                    </Text>
                  </View>
                </View>

                {/* Rounded down and given a "+" rather than the exact tally,
                    the way the "Select your challenge" list's own joined-count
                    badge reads — flat, evenly gapped tiles rather than the
                    tilted stack, so the badge has a level edge to sit on. Set
                    on the bottom edge now that the title leads: nothing below
                    the strip for it to compete with. */}
                <PhotoStrip
                  photos={section.photos}
                  height={167}
                  badge={memberCountLabel(section.members)}
                  badgePosition="bottom"
                  badgeIcon="people"
                  layout="flat"
                  style={styles.strip}
                />
              </Pressable>
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
  titleBand: {
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
  sections: {
    gap: spacing['3xl'],
  },
  section: {
    marginHorizontal: -spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  // Matches the "Daily Tasks" heading's own size on the preview page.
  sectionTitle: {
    marginBottom: spacing.xs,
  },
  sectionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sectionMetaDot: {
    width: 4,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.inkFaded,
  },
  // The strip runs wider than the text on either side, as in the reference.
  strip: {
    marginHorizontal: -spacing.sm,
  },
});
