import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { Plant } from '../types/database';
import { getSeasonalInterval } from './plantUtils';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
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
