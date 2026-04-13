import { differenceInDays, differenceInMinutes, addDays, isToday, isTomorrow, isPast } from 'date-fns';
import { Season, Plant, PlantWithStatus, WaterStatus } from '../types/database';

/**
 * Returns the current season based on the month (Northern Hemisphere)
 */
export function getCurrentSeason(): Season {
  const month = new Date().getMonth() + 1; // 1-12
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

/**
 * Returns seasonal multiplier for a plant
 */
export function getSeasonalMultiplier(plant: Plant): number {
  const season = getCurrentSeason();
  const map: Record<Season, number> = {
    spring: plant.season_spring_multiplier,
    summer: plant.season_summer_multiplier,
    autumn: plant.season_autumn_multiplier,
    winter: plant.season_winter_multiplier,
  };
  return map[season];
}

/**
 * Returns adjusted watering interval in days for current season
 */
export function getSeasonalInterval(plant: Plant): number {
  const multiplier = getSeasonalMultiplier(plant);
  return Math.round(plant.watering_interval_days * multiplier);
}

/**
 * Calculates next watering date based on last watered + seasonal interval
 */
export function calculateNextWatering(plant: Plant): Date {
  const base = plant.last_watered_at ? new Date(plant.last_watered_at) : new Date();
  const interval = getSeasonalInterval(plant);
  return addDays(base, interval);
}

/**
 * Returns water status for a plant
 */
export function getWaterStatus(plant: Plant): WaterStatus {
  const nextDate = new Date(plant.next_watering_at);
  const now = new Date();

  // Immediately after watering, keep plant out of "needs water" bucket.
  if (plant.last_watered_at) {
    const lastWatered = new Date(plant.last_watered_at);
    const minutesSinceWatered = differenceInMinutes(now, lastWatered);
    if (minutesSinceWatered >= 0 && minutesSinceWatered < 15) {
      return 'just_watered';
    }
  }

  if (isPast(nextDate) && !isToday(nextDate)) return 'overdue';
  if (isToday(nextDate)) return 'today';
  if (isTomorrow(nextDate)) return 'tomorrow';

  const days = differenceInDays(nextDate, now);
  if (days <= 1) return 'today';
  return 'upcoming';
}

/**
 * Returns days until next watering (negative = overdue)
 */
export function getDaysUntilWatering(plant: Plant): number {
  const nextDate = new Date(plant.next_watering_at);
  return differenceInDays(nextDate, new Date());
}

/**
 * Enriches a plant with computed status fields
 */
export function enrichPlant(plant: Plant): PlantWithStatus {
  return {
    ...plant,
    waterStatus: getWaterStatus(plant),
    daysUntilWatering: getDaysUntilWatering(plant),
    seasonalInterval: getSeasonalInterval(plant),
  };
}

/**
 * Returns a human-readable watering status label in Danish
 */
export function getWaterStatusLabel(status: WaterStatus, days: number): string {
  switch (status) {
    case 'overdue':
      return `${Math.abs(days)} dag${Math.abs(days) !== 1 ? 'e' : ''} forsinket`;
    case 'today':
      return 'Skal vandes i dag';
    case 'tomorrow':
      return 'Skal vandes i morgen';
    case 'upcoming':
      return `Om ${days} dage`;
    case 'just_watered':
      return 'Netop vandet';
    default:
      return '';
  }
}

/**
 * Returns season name in Danish
 */
export function getSeasonLabel(season: Season): string {
  const labels: Record<Season, string> = {
    spring: 'Forår',
    summer: 'Sommer',
    autumn: 'Efterår',
    winter: 'Vinter',
  };
  return labels[season];
}

/**
 * Returns season emoji
 */
export function getSeasonEmoji(season: Season): string {
  const emojis: Record<Season, string> = {
    spring: '🌸',
    summer: '☀️',
    autumn: '🍂',
    winter: '❄️',
  };
  return emojis[season];
}

/**
 * Formats water amount nicely
 */
export function formatWaterAmount(ml: number): string {
  if (ml >= 1000) return `${(ml / 1000).toFixed(1)}L`;
  return `${ml}ml`;
}

/**
 * Checks if user is allowed to scan (free: 3/month, premium: unlimited)
 */
export function canScan(scanCount: number, resetAt: string, isPremium: boolean): boolean {
  if (isPremium) return true;
  const resetDate = new Date(resetAt);
  const now = new Date();
  // Reset counter if it's a new month
  const isSameMonth = resetDate.getMonth() === now.getMonth() &&
    resetDate.getFullYear() === now.getFullYear();
  if (!isSameMonth) return true; // will be reset
  return scanCount < 3;
}

/**
 * Returns remaining scans for free users
 */
export function remainingScans(scanCount: number, resetAt: string): number {
  const resetDate = new Date(resetAt);
  const now = new Date();
  const isSameMonth = resetDate.getMonth() === now.getMonth() &&
    resetDate.getFullYear() === now.getFullYear();
  if (!isSameMonth) return 3;
  return Math.max(0, 3 - scanCount);
}
