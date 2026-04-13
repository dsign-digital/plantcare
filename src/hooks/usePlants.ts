import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Plant, PlantWithStatus } from '../types/database';
import { enrichPlant, calculateNextWatering } from '../lib/plantUtils';
import { useAuth } from './useAuth';
import {
  schedulePlantNotification,
  clearPlantNotifications,
  dismissAllPresentedNotifications,
} from '../lib/notifications';
import { addDays } from 'date-fns';

export function usePlants() {
  const { user, profile } = useAuth();
  const [plants, setPlants] = useState<PlantWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlants = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('plants')
      .select('*')
      .eq('user_id', user.id)
      .order('next_watering_at', { ascending: true });

    if (error) {
      setError(error.message);
    } else {
      setPlants((data ?? []).map(enrichPlant));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchPlants();
  }, [fetchPlants]);

  /**
   * Add a new plant
   */
  async function addPlant(plant: Omit<Plant, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<string | null> {
    if (!user) return 'Ikke logget ind.';

    // Free users: max 3 plants
    if (!profile?.is_premium && plants.length >= 3) {
      return 'UPGRADE_REQUIRED';
    }

    const nextWatering = calculateNextWatering({
      ...plant,
      last_watered_at: null,
    } as Plant);

    const { data, error } = await supabase
      .from('plants')
      .insert({
        ...plant,
        user_id: user.id,
        next_watering_at: nextWatering.toISOString(),
      })
      .select()
      .single();

    if (error) return error.message;
    if (data) {
      await schedulePlantNotification(data, profile?.notification_time ?? '08:00');
      await fetchPlants();
    }
    return null;
  }

  /**
   * Water a plant – logs the event and recalculates next watering
   */
  async function waterPlant(plantId: string, amountMl?: number): Promise<string | null> {
    if (!user) return 'Ikke logget ind.';

    const plant = plants.find(p => p.id === plantId);
    if (!plant) return 'Plante ikke fundet.';

    const now = new Date();
    const nextWatering = addDays(now, Math.max(1, plant.seasonalInterval));

    // Flush delivered notifications first to avoid immediate stale banner replay.
    await dismissAllPresentedNotifications();

    // Clear notifications for watered plant, including legacy entries without plantId.
    await clearPlantNotifications(plantId, plant.name);

    // Update plant
    const { error: updateError } = await supabase
      .from('plants')
      .update({
        last_watered_at: now.toISOString(),
        next_watering_at: nextWatering.toISOString(),
      })
      .eq('id', plantId);

    if (updateError) return updateError.message;

    // Log watering
    await supabase.from('watering_logs').insert({
      plant_id: plantId,
      user_id: user.id,
      watered_at: now.toISOString(),
      water_amount_ml: amountMl ?? plant.water_amount_ml,
    });

    await fetchPlants();

    // Schedule only the watered plant's next reminder.
    const updatedPlant = { ...plant, next_watering_at: nextWatering.toISOString() };
    await schedulePlantNotification(updatedPlant, profile?.notification_time ?? '08:00');

    return null;
  }

  /**
   * Update a plant
   */
  async function updatePlant(plantId: string, updates: Partial<Plant>): Promise<string | null> {
    const { error } = await supabase
      .from('plants')
      .update(updates)
      .eq('id', plantId);

    if (error) return error.message;
    await fetchPlants();
    return null;
  }

  /**
   * Delete a plant
   */
  async function deletePlant(plantId: string): Promise<string | null> {
    const { error } = await supabase
      .from('plants')
      .delete()
      .eq('id', plantId);

    if (error) return error.message;
    await fetchPlants();
    return null;
  }

  /**
   * Get watering history for a plant
   */
  async function getWateringHistory(plantId: string) {
    const { data } = await supabase
      .from('watering_logs')
      .select('*')
      .eq('plant_id', plantId)
      .order('watered_at', { ascending: false })
      .limit(20);
    return data ?? [];
  }

  const plantsNeedingWater = plants.filter(p =>
    p.waterStatus === 'overdue' || p.waterStatus === 'today'
  );

  return {
    plants,
    loading,
    error,
    plantsNeedingWater,
    plantCount: plants.length,
    fetchPlants,
    addPlant,
    waterPlant,
    updatePlant,
    deletePlant,
    getWateringHistory,
  };
}
