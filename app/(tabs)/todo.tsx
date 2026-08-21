import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AlertDialog } from '@/components/AlertDialog';
import { Card } from '@/components/Card';
import { DayRing } from '@/components/DayRing';
import { IconButton } from '@/components/IconButton';
import { PopoverMenu } from '@/components/PopoverMenu';
import { ScreenScroll } from '@/components/Screen';
import { StickyNote } from '@/components/StickyNote';
import { TaskRow } from '@/components/TaskRow';
import { TickProgressBar } from '@/components/TickProgressBar';
import { spacing } from '@/constants/theme';
import { useApp, useDayProgress } from '@/hooks/useAppState';

export default function TodoScreen() {
  const router = useRouter();
  const {
    currentDay,
    totalDays,
    profile,
    toggleTask,
    attachPhoto,
    restartChallenge,
  } = useApp();
  const rows = useDayProgress(currentDay);

  const [menuOpen, setMenuOpen] = useState(false);
  const [restartOpen, setRestartOpen] = useState(false);

  return (
    <>
      <ScreenScroll tabBar padded={false}>
        <View style={styles.header}>
          <StickyNote
            value={currentDay}
            size={72}
            colorIndex={0}
            tilt={-2}
            onPress={() => router.push('/sticker')}
          />
          <IconButton
            name="pencil"
            iconSize={21}
            onPress={() => setMenuOpen(true)}
            accessibilityLabel="Challenge options"
            style={styles.pencil}
          />
        </View>

        <View style={styles.hero}>
          <DayRing
            day={currentDay}
            avatarSeed={profile.avatarSeed}
            onPress={() => router.push('/story')}
          />
          <TickProgressBar
            day={currentDay}
            totalDays={totalDays}
            style={styles.ticks}
          />
        </View>

        <Card padded={false} style={styles.list}>
          {rows.map((row, i) => (
            <TaskRow
              key={row.task.id}
              label={row.task.label}
              done={row.done}
              time={row.time}
              photoSeed={row.photoSeed}
              onToggle={() => toggleTask(row.task.id)}
              onPressPhoto={() => attachPhoto(row.task.id)}
              divider={i < rows.length - 1}
            />
          ))}
        </Card>
      </ScreenScroll>

      <PopoverMenu
        visible={menuOpen}
        onDismiss={() => setMenuOpen(false)}
        top={96}
        items={[
          {
            label: 'Edit Challenge',
            onPress: () => router.push('/challenge/select'),
          },
          {
            label: 'Restart Challenge',
            onPress: () => setRestartOpen(true),
          },
          {
            label: 'Change Challenge',
            onPress: () => router.push('/challenge/select'),
          },
        ]}
      />

      <AlertDialog
        visible={restartOpen}
        title="Restart Challenge"
        message="Are you sure? This will reset your challenge to day 1 starting today."
        onDismiss={() => setRestartOpen(false)}
        actions={[
          { label: 'Cancel', onPress: () => setRestartOpen(false) },
          {
            label: 'Restart',
            destructive: true,
            onPress: () => {
              restartChallenge();
              setRestartOpen(false);
            },
          },
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    minHeight: 76,
  },
  pencil: {
    marginLeft: spacing.xs,
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: spacing['4xl'],
    marginTop: spacing.xs,
  },
  ticks: {
    marginTop: spacing.xl,
  },
  list: {
    marginTop: spacing['3xl'],
    marginHorizontal: spacing.sm,
  },
});
