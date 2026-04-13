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
    shouldShowBanner: true,
    shouldShowList: true,
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
    const [hours, minutes] = notificationTime.split(':').map(Number);

    nextWatering.setHours(hours, minutes, 0, 0);

    // Don't schedule in the past
    if (nextWatering <= new Date()) return null;

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${plant.name} skal vandes 💧`,
        body: `Husk at vande din ${plant.name} i dag`,
        data: { plantId: plant.id },
        categoryIdentifier: WATERING_NOTIFICATION_CATEGORY_ID,
        sound: 'default',
      },
      trigger: {
        date: nextWatering,
        channelId: 'watering',
      } as Notifications.DateTriggerInput,
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

  const plantId = String(response.notification.request.content.data?.plantId ?? '');
  if (!plantId) return;

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
  const nextWatering = addDays(now, getSeasonalInterval(plant));

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

  await schedulePlantNotification(updatedPlant, profile?.notification_time ?? '08:00');
}

/**
 * Cancel a scheduled notification by identifier
 */
export async function cancelNotification(identifier: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(identifier);
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
