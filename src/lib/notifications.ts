import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { Plant } from '../types/database';
import { getSeasonalInterval } from './plantUtils';
import { addDays } from 'date-fns';
import { supabase } from './supabase';

export const WATERING_NOTIFICATION_CATEGORY_ID = 'watering-reminder';
export const WATER_NOW_ACTION_ID = 'water-now';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // Avoid instant in-app banners right after state updates/watering actions.
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions
 * Returns true if granted
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('watering', {
      name: 'Vandingspåmindelser',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3A7D55',
      sound: 'default',
    });
  }

  await Notifications.setNotificationCategoryAsync(
    WATERING_NOTIFICATION_CATEGORY_ID,
    [
      {
        identifier: WATER_NOW_ACTION_ID,
        buttonTitle: '💧 Vandet nu',
      },
    ]
  );

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Schedules a local notification for a plant watering reminder
 */
export async function schedulePlantNotification(
  plant: Plant,
  notificationTime: string = '08:00' // HH:MM
): Promise<string | null> {
  try {
    const nextWatering = new Date(plant.next_watering_at);
    const now = new Date();
    if (Number.isNaN(nextWatering.getTime())) return null;

    const [rawHours, rawMinutes] = String(notificationTime).split(':');
    const parsedHours = Number(rawHours);
    const parsedMinutes = Number(rawMinutes);
    const hours = Number.isInteger(parsedHours) && parsedHours >= 0 && parsedHours <= 23 ? parsedHours : 8;
    const minutes = Number.isInteger(parsedMinutes) && parsedMinutes >= 0 && parsedMinutes <= 59 ? parsedMinutes : 0;

    nextWatering.setHours(hours, minutes, 0, 0);

    const minLeadMs = 60 * 60 * 1000;

    // Never allow "instant" reminders. Keep moving one day forward until safely in future.
    while (nextWatering.getTime() - now.getTime() < minLeadMs) {
      nextWatering.setDate(nextWatering.getDate() + 1);
      nextWatering.setHours(hours, minutes, 0, 0);
    }

    // Don't schedule in the past
    if (nextWatering <= now) return null;

    // Dedupe: keep max one pending reminder per plant.
    await cancelPlantNotifications(plant.id);

    const delaySeconds = Math.max(
      60,
      Math.ceil((nextWatering.getTime() - now.getTime()) / 1000)
    );

    const trigger: Notifications.NotificationTriggerInput =
      Platform.OS === 'android'
        ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: delaySeconds, channelId: 'watering' }
        : { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: delaySeconds };

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${plant.name} skal vandes 💧`,
        body: `Husk at vande din ${plant.name} i dag`,
        data: { plantId: plant.id, plantName: plant.name },
        categoryIdentifier: WATERING_NOTIFICATION_CATEGORY_ID,
        sound: 'default',
      },
      trigger,
    });

    return identifier;
  } catch (error) {
    console.error('Schedule notification error:', error);
    return null;
  }
}

/**
 * Handles notification action taps (e.g. "Vandet nu")
 */
export async function handleNotificationAction(response: Notifications.NotificationResponse): Promise<void> {
  if (response.actionIdentifier !== WATER_NOW_ACTION_ID) return;

  await Notifications.dismissNotificationAsync(response.notification.request.identifier);

  const plantId = String(response.notification.request.content.data?.plantId ?? '');
  if (!plantId) return;
  await clearPlantNotifications(
    plantId,
    String(response.notification.request.content.data?.plantName ?? '')
  );

  const { data: plant, error: plantError } = await supabase
    .from('plants')
    .select('*')
    .eq('id', plantId)
    .single();

  if (plantError || !plant) {
    console.warn('Notification water action failed: plant not found', plantError?.message);
    return;
  }

  const now = new Date();
  const nextWatering = addDays(now, Math.max(1, getSeasonalInterval(plant)));

  const { error: updateError } = await supabase
    .from('plants')
    .update({
      last_watered_at: now.toISOString(),
      next_watering_at: nextWatering.toISOString(),
    })
    .eq('id', plant.id);

  if (updateError) {
    console.warn('Notification water action failed: update error', updateError.message);
    return;
  }

  await supabase.from('watering_logs').insert({
    plant_id: plant.id,
    user_id: plant.user_id,
    watered_at: now.toISOString(),
    water_amount_ml: plant.water_amount_ml,
  });

  const { data: profile } = await supabase
    .from('profiles')
    .select('notification_time')
    .eq('id', plant.user_id)
    .single();

  const updatedPlant: Plant = {
    ...plant,
    last_watered_at: now.toISOString(),
    next_watering_at: nextWatering.toISOString(),
  };

  await clearPlantNotifications(plant.id, plant.name);
  await schedulePlantNotification(updatedPlant, profile?.notification_time ?? '08:00');
}

/**
 * Cancel a scheduled notification by identifier
 */
export async function cancelNotification(identifier: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

/**
 * Cancel all scheduled notifications for one specific plant.
 */
export async function cancelPlantNotifications(plantId: string): Promise<void> {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  const toCancel = pending.filter(
    (n) => String(n.content.data?.plantId ?? '') === String(plantId)
  );
  await Promise.all(
    toCancel.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

function matchesPlantNotification(
  notification: {
    content: {
      data?: Record<string, unknown>;
      title?: string | null;
      body?: string | null;
    };
  },
  plantId: string,
  plantName?: string
): boolean {
  const idMatch = String(notification.content.data?.plantId ?? '') === String(plantId);
  if (idMatch) return true;

  const normalizedName = (plantName ?? '').trim().toLowerCase();
  if (!normalizedName) return false;

  const title = String(notification.content.title ?? '').toLowerCase();
  const body = String(notification.content.body ?? '').toLowerCase();
  return title.includes(normalizedName) || body.includes(normalizedName);
}

/**
 * Dismiss already delivered notifications for one specific plant.
 */
export async function dismissPresentedPlantNotifications(plantId: string): Promise<void> {
  const presented = await Notifications.getPresentedNotificationsAsync();
  const toDismiss = presented.filter(
    (n) => String(n.request.content.data?.plantId ?? '') === String(plantId)
  );
  await Promise.all(
    toDismiss.map((n) => Notifications.dismissNotificationAsync(n.request.identifier))
  );
}

/**
 * Remove both scheduled and presented notifications for a plant.
 * Falls back to title/body matching for older notifications missing plantId.
 */
export async function clearPlantNotifications(plantId: string, plantName?: string): Promise<void> {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  const pendingToCancel = pending.filter((n) =>
    matchesPlantNotification(
      {
        content: {
          data: n.content.data as Record<string, unknown> | undefined,
          title: n.content.title,
          body: n.content.body,
        },
      },
      plantId,
      plantName
    )
  );
  await Promise.all(
    pendingToCancel.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );

  const presented = await Notifications.getPresentedNotificationsAsync();
  const presentedToDismiss = presented.filter((n) =>
    matchesPlantNotification(
      {
        content: {
          data: n.request.content.data as Record<string, unknown> | undefined,
          title: n.request.content.title,
          body: n.request.content.body,
        },
      },
      plantId,
      plantName
    )
  );
  await Promise.all(
    presentedToDismiss.map((n) => Notifications.dismissNotificationAsync(n.request.identifier))
  );
}

/**
 * Dismiss all notifications currently shown in notification center/tray.
 */
export async function dismissAllPresentedNotifications(): Promise<void> {
  try {
    await Notifications.dismissAllNotificationsAsync();
  } catch {
    const presented = await Notifications.getPresentedNotificationsAsync();
    await Promise.all(
      presented.map((n) => Notifications.dismissNotificationAsync(n.request.identifier))
    );
  }
}

/**
 * Cancel ALL scheduled notifications for cleanup
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Reschedule all plant notifications (call after watering or settings change)
 */
export async function rescheduleAllNotifications(
  plants: Plant[],
  notificationTime: string
): Promise<void> {
  await cancelAllNotifications();
  for (const plant of plants) {
    await schedulePlantNotification(plant, notificationTime);
  }
}

/**
 * Get all pending notification identifiers
 */
export async function getPendingNotifications() {
  return Notifications.getAllScheduledNotificationsAsync();
}
