import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DateRange } from '@/components/DateRange';
import { EmptyState } from '@/components/EmptyState';
import { Headline } from '@/components/Headline';
import { IconButton } from '@/components/IconButton';
import { profileActionHeight, profileActionTop } from '@/components/ProfileLayout';
import { PhotoStrip } from '@/components/PhotoStrip';
import { ScreenScroll } from '@/components/Screen';
import { SearchBar } from '@/components/SearchBar';
import { Text } from '@/components/Text';
import { colors, screenPadding, spacing } from '@/constants/theme';
import { challengeById } from '@/data/challenges';
import { DISCOVER } from '@/data/content';
import { addDays, shortDate } from '@/lib/format';

/**
 * The challenges going on out there, a photo strip each. Tapping one opens its
 * feed; the "+" floats over the page rather than sitting in the header, the
 * same corner every other tab root puts its own action button in.
 */
export default function DiscoverScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DISCOVER;
    return DISCOVER.filter((section) => section.title.toLowerCase().includes(q));
  }, [query]);

  return (
    // Absolute overlays need a positioned parent, otherwise their offsets
    // resolve against the scroll content instead of the screen.
    <View style={styles.screenRoot}>
      <ScreenScroll tabBar>
        {/* The button floats above this; here it only holds the row's space,
            so the title lands on the same line as it. */}
        <View style={styles.topBarSpacer} />

        <Headline size="title" align="center" style={styles.title}>
          Challenges
        </Headline>

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
              const start = new Date(section.startDate);
              const end = addDays(start, challenge.defaultDays - 1);

              return (
                <Pressable
                  key={section.id}
                  accessibilityRole="button"
                  accessibilityLabel={section.title}
                  onPress={() => router.push({ pathname: '/feed/[id]', params: { id: section.id } })}
                  style={styles.section}
                >
                  <Text variant="sectionTitle" style={styles.sectionTitle}>
                    {section.title}
                  </Text>

                  <View style={styles.meta}>
                    <Ionicons name="people" size={16} color={colors.inkMuted} />
                    <Text variant="bodyBold" color={colors.inkMuted} style={styles.metaLabel}>
                      {section.members.toLocaleString('en-US')} members
                    </Text>
                    <Text variant="bodyBold" color={colors.inkGhost} style={styles.metaDot}>
                      ·
                    </Text>
                    <Ionicons name="checkmark-done" size={16} color={colors.inkMuted} />
                    <Text variant="bodyBold" color={colors.inkMuted} style={styles.metaLabel}>
                      {challenge.tasks.length} tasks
                    </Text>
                  </View>

                  <PhotoStrip photos={section.photos} height={167} style={styles.strip} />

                  <DateRange
                    from={shortDate(start)}
                    to={shortDate(end)}
                    variant="bodyBold"
                    color={colors.inkMuted}
                    style={styles.dates}
                  />
                </Pressable>
              );
            })}
          </View>
        )}
      </ScreenScroll>

      <View style={styles.topBar}>
        <View style={styles.spacer} />
        <IconButton
          name="add"
          onPress={() => router.push('/challenge/select')}
          accessibilityLabel="Create a challenge"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
  topBarSpacer: {
    height: profileActionHeight,
  },
  // Pinned to the same line as every other tab root's corner button, measured
  // from the screen edge rather than from the scroll content.
  topBar: {
    position: 'absolute',
    top: profileActionTop,
    left: screenPadding,
    right: screenPadding,
    height: profileActionHeight,
    flexDirection: 'row',
    alignItems: 'center',
  },
  spacer: {
    flex: 1,
  },
  title: {
    marginBottom: spacing.xl,
  },
  search: {
    marginBottom: spacing['3xl'],
  },
  sections: {
    gap: spacing['3xl'],
  },
  section: {
    marginHorizontal: -spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  // Quicksand tops out at Bold, so the extra weight the reference has comes
  // from setting it a touch larger and tighter rather than from a heavier cut.
  sectionTitle: {
    fontSize: 24,
    lineHeight: 29,
    letterSpacing: -1.1,
    marginBottom: spacing.sm,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  metaLabel: {
    marginLeft: spacing.sm,
  },
  metaDot: {
    marginHorizontal: spacing.sm,
  },
  // The strip runs wider than the text on either side, as in the reference.
  strip: {
    marginHorizontal: -spacing.sm,
  },
  dates: {
    marginTop: spacing.md,
  },
});
