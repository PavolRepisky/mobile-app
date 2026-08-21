import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import { AvatarPlaceholder } from '@/components/Placeholder';
import { ScreenScroll } from '@/components/Screen';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { TaskRow } from '@/components/TaskRow';
import { Text } from '@/components/Text';
import { WallSection } from '@/components/WallSection';
import { colors, screenPadding, spacing } from '@/constants/theme';
import { FRIENDS, WALL_SECTIONS } from '@/data/content';

type Tab = 'profile' | 'wall';

/** A friend's profile, presented as a sheet from the Friends list. */
export default function FriendProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('profile');

  const friend = FRIENDS.find((f) => f.id === String(id)) ?? FRIENDS[0];

  return (
    // Absolute overlays need a positioned parent, otherwise their offsets
    // resolve against the scroll content instead of the screen.
    <View style={styles.screenRoot}>
      <ScreenScroll bottomExtra={spacing['4xl']}>
        <View style={styles.identity}>
          <AvatarPlaceholder seed={friend.avatarSeed} size={150} />
          <Text variant="sectionTitle" style={styles.name}>
            {friend.name}
          </Text>
          <Text variant="body" color={colors.inkMuted}>
            {friend.bio ?? 'No bio yet'}
          </Text>
        </View>

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
            <Text variant="sectionTitle" style={styles.heading}>
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
                  divider={i < friend.tasks.length - 1}
                />
              ))}
            </Card>
          </>
        ) : (
          <View>
            {WALL_SECTIONS.map((section) => (
              <WallSection key={section} title={section} seed={`${friend.id}-${section}`} />
            ))}
          </View>
        )}
      </ScreenScroll>

      <IconButton
        name="close"
        onPress={() => router.back()}
        accessibilityLabel="Close"
        style={styles.close}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
  identity: {
    alignItems: 'center',
    marginTop: spacing['5xl'],
  },
  name: {
    marginTop: spacing.lg,
  },
  tabs: {
    marginTop: spacing.xl,
    marginBottom: spacing['2xl'],
  },
  heading: {
    marginBottom: spacing.lg,
  },
  card: {
    marginHorizontal: -spacing.md,
  },
  close: {
    position: 'absolute',
    top: 56,
    right: screenPadding,
  },
});
