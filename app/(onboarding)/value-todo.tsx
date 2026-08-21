import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { DayRing } from '@/components/DayRing';
import { IconButton } from '@/components/IconButton';
import { StickyNote } from '@/components/StickyNote';
import { TaskRow } from '@/components/TaskRow';
import { TickProgressBar } from '@/components/TickProgressBar';
import { ValueProp } from '@/components/ValueProp';
import { colors, radii, shadows, spacing } from '@/constants/theme';
import { CHALLENGES } from '@/data/challenges';

const PREVIEW_TASKS = CHALLENGES[0].tasks.slice(0, 3);

/**
 * "Your daily to-do, your aesthetic." — a scaled-down mock of the To-do home
 * inside a phone frame.
 */
export default function ValueTodoScreen() {
  return (
    <ValueProp
      headline={'Your daily to-do,\nyour *aesthetic.*'}
      href="/(onboarding)/value-friends"
    >
      <View style={styles.phone}>
        <View style={styles.phoneScreen}>
          <View style={styles.header}>
            <StickyNote value={1} size={52} colorIndex={0} tilt={-2} />
            <IconButton name="pencil" size={40} iconSize={17} shadow={false} />
          </View>

          <View style={styles.hero}>
            <DayRing day={1} avatarSeed="preview-avatar" size={112} />
            <TickProgressBar day={1} totalDays={75} height={22} style={styles.ticks} />
          </View>

          <Card padded={false} style={styles.list} flat>
            {PREVIEW_TASKS.map((task, i) => (
              <TaskRow
                key={task.id}
                label={task.label}
                done={false}
                photoSeed={i < 2 ? `preview-${task.id}` : null}
                divider={i < PREVIEW_TASKS.length - 1}
              />
            ))}
          </Card>
        </View>
      </View>
    </ValueProp>
  );
}

const styles = StyleSheet.create({
  phone: {
    alignSelf: 'center',
    width: '82%',
    aspectRatio: 0.49,
    borderRadius: 46,
    borderWidth: 9,
    borderColor: '#1B1B1B',
    backgroundColor: '#1B1B1B',
    overflow: 'hidden',
    marginTop: spacing.xl,
    ...shadows.floating,
  },
  phoneScreen: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 38,
    overflow: 'hidden',
    paddingTop: spacing['2xl'],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
    marginTop: spacing.sm,
  },
  ticks: {
    marginTop: spacing.md,
  },
  list: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.sm,
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    flex: 1,
  },
});
