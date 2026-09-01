import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import { ProfileLayout, profileAvatarSize } from '@/components/ProfileLayout';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { TaskRow } from '@/components/TaskRow';
import { Text } from '@/components/Text';
import { WallSection } from '@/components/WallSection';
import { colors, spacing } from '@/constants/theme';
import { PEOPLE, WALL_COLLECTIONS } from '@/data/content';

type Tab = 'profile' | 'wall';

/** A friend's profile, presented as a sheet from the Friends list. */
export default function FriendProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('profile');

  const friend = PEOPLE.find((f) => f.id === String(id)) ?? PEOPLE[0];

  return (
    // Near-white, not the warm app shell — the reference splits the two.
    <ProfileLayout
      tone="plain"
      bottomExtra={spacing['4xl']}
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
          <Text
            variant="sectionTitle"
            color={colors.inkSlate}
            style={styles.heading}
          >
            Today&apos;s Tasks
          </Text>

          <Card padded={false} style={styles.card}>
            {friend.tasks.map((task, i) => (
              <TaskRow
                key={task.label}
                label={task.label}
                done={task.done}
                time={task.time}
                photoSeed={null}
                index={i}
                divider={i < friend.tasks.length - 1}
              />
            ))}
          </Card>
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
  heading: {
    marginBottom: spacing.lg,
    // A step down from the section-title cut, matching the reference.
    fontSize: 21,
    lineHeight: 27,
  },
  card: {
    marginHorizontal: -spacing.md,
  },
});
