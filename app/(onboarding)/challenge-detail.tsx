import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/Buttons';
import { ChallengeDetail } from '@/components/ChallengeDetail';
import { Headline } from '@/components/Headline';
import { IconButton } from '@/components/IconButton';
import { ScreenScroll } from '@/components/Screen';
import { colors, screenPadding, spacing } from '@/constants/theme';
import { useApp } from '@/hooks/useAppState';

/**
 * The task list for the chosen challenge, with the Validate button docked over
 * the scrolling reviews.
 */
export default function ChallengeDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { challenge, tasks, addTask, updateTaskLabel, reorderTask } = useApp();

  return (
    <View style={styles.root}>
      <ScreenScroll tone="onboarding" bottomExtra={120}>
        <View style={styles.header}>
          <Headline size="title">{challenge.name}</Headline>
          <IconButton
            name="chevron-back"
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            style={styles.back}
          />
        </View>

        <ChallengeDetail
          challenge={challenge}
          tasks={tasks}
          onAddTask={addTask}
          onRenameTask={updateTaskLabel}
          onReorder={reorderTask}
        />
      </ScreenScroll>

      <View
        style={[styles.dock, { paddingBottom: insets.bottom + spacing.lg }]}
      >
        <PrimaryButton
          label="Validate"
          onPress={() => router.push('/(onboarding)/start-date')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.backgroundOnboarding,
  },
  header: {
    minHeight: 60,
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  back: {
    position: 'absolute',
    left: 0,
  },
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: screenPadding,
    paddingTop: spacing.md,
    backgroundColor: colors.backgroundOnboarding,
  },
});
