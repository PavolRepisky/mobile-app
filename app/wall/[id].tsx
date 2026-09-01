import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/IconButton';
import { Placeholder } from '@/components/Placeholder';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { colors, radii, spacing } from '@/constants/theme';
import { WALL_ITEMS } from '@/data/content';
import { useApp } from '@/hooks/useAppState';

/**
 * One pinned thing off a profile wall, blown up: the photo, its title, and
 * whatever was written under it — the recipe, the routine, the caption.
 *
 * The photo takes every pixel the back button and the caption don't need, so
 * it fills the height of the screen rather than sitting in a fixed box.
 *
 * Two kinds of thing land here: what a friend has pinned, which ships with the
 * app, and what you have pinned yourself, which is state and can be rewritten
 * — so only the second gets a pencil.
 */
export default function WallItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { wall } = useApp();

  const key = String(id);
  const mine = wall.flatMap((board) => board.pins).find((pin) => pin.id === key);
  const theirs = WALL_ITEMS.find((i) => i.id === key);
  // No silent fall back to the first item: showing somebody else's pin under
  // this id reads as the screen having lost what was written on it.
  const item = mine ?? theirs;

  // A friend's note is already a set of lines; your own is one field, and the
  // line breaks in it are the ones you typed.
  const lines = mine
    ? mine.note?.split(/\r?\n/).filter((line) => line.trim().length > 0)
    : theirs?.note;
  const link = mine?.link;

  if (!item) return null;

  return (
    <Screen tone="plain">
      {/* In the flow rather than floating over the photo: a fixed top offset
          and the safe-area inset land on the same line on a notched phone,
          which left the button sitting on the picture. */}
      <View style={styles.topBar}>
        <IconButton
          name="chevron-back"
          onPress={() => router.back()}
          accessibilityLabel="Back"
        />
        {mine ? (
          <IconButton
            name="pencil"
            iconSize={21}
            onPress={() =>
              router.push({
                pathname: '/wall/create',
                params: { edit: mine.id },
              })
            }
            accessibilityLabel="Edit pin"
          />
        ) : null}
      </View>

      <View style={styles.photo}>
        {item.photo ? (
          <Image
            source={item.photo}
            contentFit="cover"
            transition={200}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          // Only a friend's item can be photoless; your own pin is a photo by
          // definition, so a seed can only have come from theirs.
          <Placeholder
            seed={theirs?.seed ?? item.id}
            radius={radii.card}
            style={StyleSheet.absoluteFill}
          />
        )}
      </View>

      {/* The caption keeps clear of the home indicator; whatever is left over
          goes to the photo. */}
      <View
        style={[
          styles.caption,
          { paddingBottom: insets.bottom + spacing['2xl'] },
        ]}
      >
        <Text variant="sectionTitle" center style={styles.title}>
          {item.title}
        </Text>

        {lines?.length ? (
          <View style={styles.note}>
            {lines.map((line, i) => (
              <Text key={i} variant="bodyStrong" color={colors.inkSoft} center>
                {line}
              </Text>
            ))}
          </View>
        ) : null}

        {link ? (
          <Pressable
            accessibilityRole="link"
            onPress={() => Linking.openURL(link).catch(() => {})}
            style={({ pressed }) => [styles.link, pressed && styles.pressed]}
          >
            <Text variant="bodyStrong" color={colors.ink} center>
              {link}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photo: {
    // Takes the whole screen apart from what the button and caption ask for.
    flex: 1,
    marginTop: spacing.lg,
    borderRadius: radii.card,
    overflow: 'hidden',
    backgroundColor: colors.surfaceSunken,
  },
  caption: {
    paddingTop: spacing['2xl'],
  },
  title: {
    // A step up from the section-title cut: on this screen the title is the
    // whole headline, the way the reference sets it.
    fontSize: 30,
    lineHeight: 36,
  },
  note: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  link: {
    marginTop: spacing.lg,
  },
  pressed: {
    opacity: 0.6,
  },
});
