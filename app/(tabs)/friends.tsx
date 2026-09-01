import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BigSegmentHeader } from '@/components/BigSegmentHeader';
import { FriendCard } from '@/components/FriendCard';
import { IconButton } from '@/components/IconButton';
import { PhotoStrip } from '@/components/PhotoStrip';
import { ScreenScroll } from '@/components/Screen';
import { Text } from '@/components/Text';
import { colors, fonts, spacing, tabBarTop } from '@/constants/theme';
import { DISCOVER, FRIENDS } from '@/data/content';

type Side = 'discover' | 'friends';

/**
 * Two panes behind one header. Discover lists challenge feeds; Friends lists
 * the people you're doing it with, with a `+` to invite more.
 */
export default function FriendsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [side, setSide] = useState<Side>('friends');

  return (
    // Absolute overlays need a positioned parent, otherwise their offsets
    // resolve against the scroll content instead of the screen.
    <View style={styles.screenRoot}>
      <ScreenScroll tabBar>
        <BigSegmentHeader
          options={[
            {
              key: 'discover',
              label: 'Discover',
              // A photo from three of the challenges below, as the cluster
              // stands for Discover as a whole rather than any one feed.
              avatars: DISCOVER.slice(0, 3).map((section) => section.photos[0]),
            },
            {
              key: 'friends',
              label: 'Friends',
              avatars: FRIENDS.map((friend) => friend.avatar),
            },
          ]}
          value={side}
          onChange={setSide}
          style={styles.header}
        />

        {side === 'discover' ? (
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
        ) : (
          <View style={styles.sections}>
            {FRIENDS.map((friend) => (
              <FriendCard
                key={friend.id}
                friend={friend}
                onPress={() => router.push({ pathname: '/friend/[id]', params: { id: friend.id } })}
                style={styles.friendCard}
              />
            ))}
          </View>
        )}
      </ScreenScroll>

      {side === 'friends' ? (
        <IconButton
          name="add"
          size={64}
          iconSize={30}
          onPress={() => router.push('/invite')}
          accessibilityLabel="Invite a friend"
          style={[styles.fab, { bottom: tabBarTop(insets.bottom) + spacing.lg }]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
  header: {
    marginTop: spacing.lg,
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
  friendCard: {
    marginBottom: 0,
  },
  // `bottom` is set at render: it tracks the tab bar, which rides the
  // home-indicator inset.
  fab: {
    position: 'absolute',
    right: spacing.xl,
  },
});
