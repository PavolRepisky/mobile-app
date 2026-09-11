import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { IconButton } from '@/components/IconButton';
import { PhotoStrip, type PhotoSource } from '@/components/PhotoStrip';
import { ProfileLayout, profileAvatarSize } from '@/components/ProfileLayout';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { Text } from '@/components/Text';
import { WallSection } from '@/components/WallSection';
import { colors, spacing } from '@/constants/theme';
import { PEOPLE, WALL_COLLECTIONS, challengeStrip } from '@/data/content';
import { useApp } from '@/hooks/useAppState';

type Tab = 'profile' | 'wall';

/**
 * A friend's or a challenge member's profile, presented as a sheet from the
 * Community tab. Same shell as your own Profile screen — the title band, the
 * circle, the current-challenge card — just without any of that screen's edit
 * affordances: no photo picker on the avatar, no settings gear, a plain close
 * in the corner instead.
 */
export default function FriendProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { challenge, totalDays } = useApp();
  const [tab, setTab] = useState<Tab>('profile');

  const friend = PEOPLE.find((f) => f.id === String(id)) ?? PEOPLE[0];

  // Their own shot proof photos where they have any; the challenge's own
  // strip otherwise, the same fallback your own Profile card uses.
  const friendPhotos = friend.tasks.reduce<PhotoSource[]>((acc, task) => {
    if (task.photo) acc.push(task.photo);
    else if (task.photoSeed) acc.push(task.photoSeed);
    return acc;
  }, []);
  const photos = friendPhotos.length > 0 ? friendPhotos : challengeStrip(challenge.id);

  return (
    // Near-white, not the warm app shell — the reference splits the two.
    <ProfileLayout
      tone="plain"
      bottomExtra={spacing['4xl']}
      leading={
        <Text variant="sectionTitle" center>
          Profile
        </Text>
      }
      identity={
        <>
          <Avatar source={friend.avatar} size={profileAvatarSize} />
          <Text variant="sectionTitle" style={styles.name}>
            {friend.name}
          </Text>
          <Text variant="bodyBold" color={colors.inkMuted}>
            {friend.bio ?? 'No bio yet'}
          </Text>
        </>
      }
      action={
        <IconButton
          name="close"
          onPress={() => router.back()}
          accessibilityLabel="Close"
        />
      }
    >
      <SegmentedTabs
        options={[
          { key: 'profile', label: 'Profile' },
          { key: 'wall', label: 'My Wall' },
        ]}
        value={tab}
        onChange={setTab}
        style={styles.tabs}
      />

      {tab === 'profile' ? (
        <>
          <Text variant="sectionTitle" style={styles.challengeSectionTitle}>
            Current challenge
          </Text>

          {/* Your own Profile screen's own card: same title-then-strip shape,
              badged with where they stand rather than a member count. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${challenge.name}, day ${friend.day} of ${totalDays}`}
            onPress={() =>
              router.push({ pathname: '/feed/[id]', params: { id: challenge.id } })
            }
            style={styles.challengeCard}
          >
            <Text variant="sectionTitleXs" style={styles.challengeCardTitle}>
              {challenge.name}
            </Text>

            <PhotoStrip
              photos={photos}
              height={167}
              badge={`Day ${friend.day} of ${totalDays}`}
              badgePosition="bottom"
              badgeIcon="calendar"
              layout="flat"
              style={styles.joinedStrip}
            />
          </Pressable>
        </>
      ) : (
        <View>
          {/* Only the collections they have actually filled — an empty
              section is left off rather than shown with nothing in it. */}
          {WALL_COLLECTIONS.map((collection) => (
            <WallSection
              key={collection.id}
              title={collection.title}
              items={collection.items}
              onPressItem={(item) => router.push(`/wall/${item.id}`)}
            />
          ))}
        </View>
      )}
    </ProfileLayout>
  );
}

const styles = StyleSheet.create({
  name: {
    marginTop: spacing.lg,
  },
  tabs: {
    marginTop: spacing.xl,
    marginBottom: spacing['2xl'],
  },
  challengeSectionTitle: {
    marginBottom: spacing.lg,
  },
  // Bleeds to the page edge and back in, the same trick your own Profile
  // screen's card uses to give its Pressable a full-width hit target without
  // widening the photo strip past the page gutter.
  challengeCard: {
    marginHorizontal: -spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  challengeCardTitle: {
    marginBottom: spacing.xs,
  },
  // The strip runs wider than the page gutter on either side, as it does on
  // your own Profile screen.
  joinedStrip: {
    marginHorizontal: -spacing.sm,
  },
});
