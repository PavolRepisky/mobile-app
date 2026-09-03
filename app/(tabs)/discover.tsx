import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { PhotoStrip } from '@/components/PhotoStrip';
import { ScreenScroll } from '@/components/Screen';
import { Text } from '@/components/Text';
import { colors, fonts, spacing } from '@/constants/theme';
import { DISCOVER } from '@/data/content';

/**
 * The challenges going on out there, a photo strip each. Tapping one opens its
 * feed. The tab bar names the page, so it opens straight on the first
 * challenge rather than on a title repeating the tab.
 */
export default function DiscoverScreen() {
  const router = useRouter();

  return (
    <ScreenScroll tabBar>
      <View style={styles.sections}>
        {DISCOVER.map((section) => (
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

            <PhotoStrip photos={section.photos} height={167} style={styles.strip} />

            <View style={styles.meta}>
              <Ionicons name="chatbubble" size={18} color={colors.ink} />
              <Text variant="bodyBold" style={styles.metaLabel}>
                {section.meta}
              </Text>
              {section.metaTime ? (
                <>
                  <Text
                    variant="bodyBold"
                    color={colors.inkGhost}
                    style={styles.metaDot}
                  >
                    ·
                  </Text>
                  <Text
                    variant="label"
                    color={colors.inkGhost}
                    style={styles.metaTime}
                  >
                    {section.metaTime}
                  </Text>
                </>
              ) : null}
            </View>
          </Pressable>
        ))}
      </View>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
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
  // The strip runs wider than the text on either side, as in the reference.
  strip: {
    marginHorizontal: -spacing.sm,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  metaLabel: {
    marginLeft: spacing.sm,
  },
  // The separator carries its own air; a typed space is too tight for it.
  metaDot: {
    marginHorizontal: spacing.sm,
  },
  // Same weight as the name it trails, a size down.
  metaTime: {
    fontFamily: fonts.bodyBold,
  },
});
