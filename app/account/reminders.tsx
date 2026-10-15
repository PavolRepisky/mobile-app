import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ReminderListRow, ReminderRow } from '@/components/ReminderPill';
import { NATIVE_HEADER, ScreenScroll } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SettingsGroup, SettingsList } from '@/components/SettingsList';
import { Text } from '@/components/Text';
import { colors, layout, radii, spacing } from '@/constants/theme';
import { DEFAULT_TASK_REMINDER, useApp } from '@/hooks/useAppState';

/**
 * When each of today's tasks nudges you, and the one nudge that isn't a
 * task's — the last call, which only comes while one is still missing — on a
 * page of their own, opened from Settings' Reminders row. Each change is kept
 * as it's made, so there's nothing to save: back is done.
 */
export default function RemindersScreen() {
  const { tasks, reminders, setReminders } = useApp();

  const reminderFor = (taskId: string) =>
    taskId in reminders.tasks ? reminders.tasks[taskId] : DEFAULT_TASK_REMINDER;
  const setReminderFor = (taskId: string, at: number | null) =>
    setReminders({ ...reminders, tasks: { ...reminders.tasks, [taskId]: at } });

  /** The one reminder whose wheel is open, where the rows draw their own —
   * a task's id, or `lastCall`. One at a time, so the list stays short. */
  const [editing, setEditing] = useState<string | null>(null);
  const toggle = (key: string) => setEditing((current) => (current === key ? null : key));

  // On the iPhone, the same system list Settings is, so its group titles,
  // cards and spacing are the Settings page's own rather than drawn alike.
  if (NATIVE_HEADER) {
    return (
      <SettingsList header={<ScreenHeader plainTitle="Reminders" />}>
        <SettingsGroup title="Tasks">
          {tasks.map((task) => (
            <ReminderListRow
              key={task.id}
              label={task.label}
              value={reminderFor(task.id)}
              onChange={(at) => setReminderFor(task.id, at)}
            />
          ))}
        </SettingsGroup>
        <SettingsGroup title="Last call">
          <ReminderListRow
            label="Last call"
            value={reminders.lastCall}
            onChange={(at) => setReminders({ ...reminders, lastCall: at })}
          />
        </SettingsGroup>
      </SettingsList>
    );
  }

  return (
    <ScreenScroll tone="alt" header={<ScreenHeader plainTitle="Reminders" />}>
      <View style={styles.group}>
        <Text variant="metaBold" color={colors.inkMuted} style={styles.groupTitle}>
          Tasks
        </Text>
        <View style={styles.card}>
          {tasks.map((task, i) => (
            <ReminderRow
              key={task.id}
              label={task.label}
              value={reminderFor(task.id)}
              onChange={(at) => setReminderFor(task.id, at)}
              open={editing === task.id}
              onToggle={() => toggle(task.id)}
              divider={i < tasks.length - 1}
            />
          ))}
        </View>
      </View>

      <View style={styles.group}>
        <Text variant="metaBold" color={colors.inkMuted} style={styles.groupTitle}>
          Last call
        </Text>
        <View style={styles.card}>
          <ReminderRow
            label="Last call"
            value={reminders.lastCall}
            onChange={(at) => setReminders({ ...reminders, lastCall: at })}
            open={editing === 'lastCall'}
            onToggle={() => toggle('lastCall')}
          />
        </View>
      </View>
    </ScreenScroll>
  );
}

// Elsewhere, drawn as the Settings list's own drawn groups — a white card on
// the grey page, its title over it in the same type — so the page reads as
// one more page of Settings.
const styles = StyleSheet.create({
  group: {
    marginBottom: layout.section,
  },
  groupTitle: {
    marginBottom: layout.stack,
    marginLeft: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
  },
});
