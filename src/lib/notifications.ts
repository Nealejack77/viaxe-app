// Device notification helpers. Push/local notifications are native-only —
// every entry point is a safe no-op on web, where the in-app notification
// centre (NotificationsScreen) is the delivery surface instead.
import { Platform } from 'react-native';

let Notifications: typeof import('expo-notifications') | null = null;
if (Platform.OS !== 'web') {
  // Static require so Metro bundles it for native; never evaluated on web.
  Notifications = require('expo-notifications');
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Notifications) return false;
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
  } catch {
    return false;
  }
}

export async function hasNotificationPermission(): Promise<boolean> {
  if (!Notifications) return false;
  try {
    return (await Notifications.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

// Daily local training reminder at the given hour. Replaces any previous one.
const WORKOUT_REMINDER_ID = 'viaxe-workout-reminder';

export async function scheduleDailyWorkoutReminder(hour = 17, minute = 0): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(WORKOUT_REMINDER_ID).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: WORKOUT_REMINDER_ID,
      content: {
        title: 'Training time 💪',
        body: "Today's session is loaded in the Train tab. Show up for yourself.",
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
    });
  } catch {}
}

export async function cancelDailyWorkoutReminder(): Promise<void> {
  if (!Notifications) return;
  try { await Notifications.cancelScheduledNotificationAsync(WORKOUT_REMINDER_ID); } catch {}
}
