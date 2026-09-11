import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FriendCard } from '@/components/FriendCard';
import { IconButton } from '@/components/IconButton';
import { PhotoCollage, type CollageCell } from '@/components/PhotoCollage';
import { profileActionTop } from '@/components/ProfileLayout';
import { ScreenScroll, topPadding } from '@/components/Screen';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { Text } from '@/components/Text';
import { colors, screenPadding, shadows, spacing } from '@/constants/theme';
import { FEED_AUTHORS, FRIENDS, type Friend } from '@/data/content';

/** Matches every other tab root's own corner button. */
const ADD_SIZE = 46;

type Tab = 'friends' | 'members';

const memberCell = (person: Friend, onPress: () => void): CollageCell => ({
  key: person.id,
  label: person.name,
  onPress,
  ...(typeof person.avatar === 'string'
    ? { seed: person.avatar }
    : { photo: person.avatar }),
});

/**
 * The people you're doing it with: your own friends' days in one feed, and
 * everyone else posting in the same challenge a tap away in Members — laid
 * out in the same mosaic grid the To-do tab cuts its own day into, so a
 * member reads as a face in that block rather than a row in a directory. The
 * header matches every other tab root's own — centred title, a black "+"
 * pinned top-right — rather than the page carrying its own floating button.
 */
export default function CommunityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('friends');

  // The shared line the title and the corner button both sit on: normally
  // the button's own fixed offset, but on a deep safe-area inset the scroll's
  // own top padding can run past it. Discover's and Profile's own header.
  const headerTop = Math.max(profileActionTop, topPadding(insets.top));
  const titleOffset = headerTop - topPadding(insets.top);

  const openProfile = (id: string) =>
    router.push({ pathname: '/friend/[id]', params: { id } });

  return (
    // Absolute overlays need a positioned parent, otherwise their offsets
    // resolve against the scroll content instead of the screen.
    <View style={styles.screenRoot}>
      <ScreenScroll tabBar>
        <View style={[styles.titleBand, { marginTop: titleOffset }]}>
          <Text variant="sectionTitle" center>
            Community
          </Text>
        </View>

        <SegmentedTabs
          options={[
            { key: 'friends', label: 'Friends' },
            { key: 'members', label: 'Members' },
          ]}
          value={tab}
          onChange={setTab}
          style={styles.tabs}
        />

        {tab === 'friends' ? (
          <View style={styles.sections}>
            {FRIENDS.map((friend) => (
              <FriendCard
                key={friend.id}
                friend={friend}
                onPress={() => openProfile(friend.id)}
                style={styles.friendCard}
              />
            ))}
          </View>
        ) : (
          <PhotoCollage
            layout="mosaic"
            showLabels
            cells={FEED_AUTHORS.map((person) =>
              memberCell(person, () => openProfile(person.id)),
            )}
          />
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
        onPress={() => router.push('/invite')}
        accessibilityLabel="Invite a friend"
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
  },
  tabs: {
    marginTop: spacing.xl,
    marginBottom: spacing['2xl'],
  },
  corner: {
    position: 'absolute',
    right: screenPadding,
  },
  sections: {
    gap: spacing['3xl'],
  },
  friendCard: {
    marginBottom: 0,
  },
});
