import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { PlannedReminder } from '@/lib/reminderPlan';

export { planReminders, WINDOW_DAYS, type PlannedReminder, type ReminderPlanInput } from '@/lib/reminderPlan';

/**
 * The nudges picked while joining, as notifications the phone fires itself —
 * no server, no push: each task's time, and the last call before midnight.
 *
 * They're planned a week ahead and planned again whenever anything they
 * depend on changes — the app opening, a photo taken or undone, new times —
 * because an iPhone holds at most 64 waiting notifications, and because a
 * nudge has to know what it's nudging about: a task already done today isn't
 * reminded of, and the last call only comes while something's still open,
 * saying how much.
 */

const CHANNEL = 'reminders';

/** Notifications that arrive while the app is open still show, as a banner. */
export function configureNotifications() {
  if (Platform.OS === 'web') return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.HIGH,
    }).catch(() => {});
  }
}

/**
 * Asks the phone's permission — only if it has never been asked. Once
 * answered either way, it's never asked again: a "no" is respected, and can
 * be changed in the phone's own Settings.
 */
export async function askForNotifications(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.status !== 'undetermined') return current.granted;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/**
 * Replaces whatever is set with `plan`. Never asks for permission itself:
 * without it, nothing is set and nothing is said.
 */
export async function scheduleReminders(plan: readonly PlannedReminder[]) {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!plan.length || !(await Notifications.getPermissionsAsync()).granted) return;
  for (const reminder of plan) {
    await Notifications.scheduleNotificationAsync({
      content: { title: reminder.title, body: reminder.body, data: { open: 'tasks' } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminder.at,
        channelId: CHANNEL,
      },
    });
  }
}
