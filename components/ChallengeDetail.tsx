import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { colors, fonts, radii, shadows, spacing } from '@/constants/theme';
import type { Challenge, ChallengeTask } from '@/data/challenges';
import { REVIEWS } from '@/data/content';
import { joinedLabel } from '@/lib/format';
import { BottomSheet } from './BottomSheet';
import { CheckCircle } from './TaskRow';
import { PhotoStrip } from './PhotoStrip';
import { ReviewCard } from './ReviewCard';
import { StickyNote } from './StickyNote';
import { Text } from './Text';

export interface ChallengeDetailProps {
  challenge: Challenge;
  tasks: readonly ChallengeTask[];
  onAddTask: () => void;
  onRenameTask: (taskId: string, label: string) => void;
  onReorder: (from: number, to: number) => void;
}

/**
 * The body of a challenge screen: photo strip, the "Create Daily Task+" well,
 * the reorderable sticky-note task list, then the review wall.
 *
 * Tapping a task's pencil raises an inline sheet with the label in a field —
 * the state shown in onboarding screen 13.
 */
export function ChallengeDetail({
  challenge,
  tasks,
  onAddTask,
  onRenameTask,
  onReorder,
}: ChallengeDetailProps) {
  const [editing, setEditing] = useState<ChallengeTask | null>(null);
  const [draft, setDraft] = useState('');

  const openEditor = (task: ChallengeTask) => {
    setEditing(task);
    setDraft(task.label);
  };

  const commit = () => {
    if (editing && draft.trim()) onRenameTask(editing.id, draft.trim());
    setEditing(null);
  };

  return (
    <View>
      <PhotoStrip
        seeds={challenge.photoSeeds}
        badge={challenge.joined ? joinedLabel(challenge.joined) : undefined}
        height={170}
      />

      <Pressable
        accessibilityRole="button"
        onPress={onAddTask}
        style={({ pressed }) => [styles.addWell, pressed && styles.pressed]}
      >
        <Text variant="sectionTitle" color={colors.inkMuted}>
          Create Daily Task+
        </Text>
      </Pressable>

      <View style={styles.taskList}>
        {tasks.map((task, i) => (
          <View key={task.id} style={styles.taskRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Move ${task.label} up`}
              onPress={() => onReorder(i, i - 1)}
              hitSlop={10}
              style={styles.handle}
            >
              <Ionicons name="reorder-three" size={22} color={colors.field} />
            </Pressable>

            <StickyNote value={i + 1} size={62} colorIndex={i} tilt={i % 2 ? 1.5 : -1.5} />

            <Text variant="bodyBold" style={styles.taskLabel}>
              {task.label}
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Edit ${task.label}`}
              onPress={() => openEditor(task)}
              style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}
            >
              <Ionicons name="pencil" size={18} color={colors.ink} />
            </Pressable>
          </View>
        ))}
      </View>

      <View style={styles.reviews}>
        {REVIEWS.map((review) => (
          <ReviewCard key={review.id} review={review} style={styles.review} />
        ))}
      </View>

      <BottomSheet visible={!!editing} onDismiss={commit} handle={false}>
        <View style={styles.editorRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            autoFocus
            multiline
            style={styles.editorInput}
            placeholder="Task"
            placeholderTextColor={colors.inkMuted}
          />
          <CheckCircle checked onPress={commit} size={54} />
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  addWell: {
    marginTop: spacing['3xl'],
    height: 78,
    borderRadius: radii.card,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskList: {
    marginTop: spacing.lg,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dividerStrong,
  },
  handle: {
    paddingRight: spacing.md,
  },
  taskLabel: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  editButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.md,
  },
  reviews: {
    marginTop: spacing['3xl'],
    gap: spacing.xl,
  },
  review: {
    ...shadows.soft,
  },
  editorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  editorInput: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.ink,
    marginRight: spacing.lg,
  },
  pressed: {
    opacity: 0.85,
  },
});

export default ChallengeDetail;
