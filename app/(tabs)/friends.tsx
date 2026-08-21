import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BigSegmentHeader } from '@/components/BigSegmentHeader';
import { FriendCard } from '@/components/FriendCard';
import { IconButton } from '@/components/IconButton';
import { PhotoStrip } from '@/components/PhotoStrip';
import { ScreenScroll } from '@/components/Screen';
import { Text } from '@/components/Text';
import { colors, spacing, tabBarClearance } from '@/constants/theme';
import { DISCOVER, FRIENDS } from '@/data/content';

type Side = 'discover' | 'friends';

/**
 * Two panes behind one header. Discover lists challenge feeds; Friends lists
 * the people you're doing it with, with a `+` to invite more.
 */
export default function FriendsScreen() {
  const router = useRouter();
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
              seeds: ['disc-1', 'disc-2', 'disc-3'],
            },
            { key: 'friends', label: 'Friends', seeds: ['friend-lily'] },
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

                <PhotoStrip seeds={section.seeds} height={190} />

                <View style={styles.meta}>
                  <Ionicons name="chatbubble" size={16} color={colors.ink} />
                  <Text variant="bodyStrong" style={styles.metaLabel}>
                    {section.meta}
                  </Text>
                  {section.metaTime ? (
                    <Text variant="body" color={colors.inkMuted}>
                      {' · '}
                      {section.metaTime}
                    </Text>
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
          style={styles.fab}
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
  sectionTitle: {
    marginBottom: spacing.sm,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  metaLabel: {
    marginLeft: spacing.sm,
  },
  friendCard: {
    marginBottom: 0,
  },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: tabBarClearance + spacing.xl,
  },
});
