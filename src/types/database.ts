export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          is_premium: boolean;
          premium_expires_at: string | null;
          revenuecat_customer_id: string | null;
          scan_count_this_month: number;
          scan_count_reset_at: string;
          notification_time: string; // HH:MM format
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      plants: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          scientific_name: string | null;
          common_name: string | null;
          image_url: string | null;
          watering_interval_days: number;
          water_amount_ml: number;
          last_watered_at: string | null;
          next_watering_at: string;
          room: string | null;
          notes: string | null;
          plant_id_data: Json | null; // raw response from plant.id
          // Seasonal adjustments (multiplier on interval)
          season_spring_multiplier: number;
          season_summer_multiplier: number;
          season_autumn_multiplier: number;
          season_winter_multiplier: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['plants']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['plants']['Insert']>;
      };
      watering_logs: {
        Row: {
          id: string;
          plant_id: string;
          user_id: string;
          watered_at: string;
          water_amount_ml: number;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['watering_logs']['Row'], 'id' | 'created_at'>;
        Update: never;
      };
    };
  };
}

// App-level types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Plant = Database['public']['Tables']['plants']['Row'];
export type WateringLog = Database['public']['Tables']['watering_logs']['Row'];

export type WaterStatus = 'overdue' | 'today' | 'tomorrow' | 'upcoming' | 'just_watered';

export interface PlantWithStatus extends Plant {
  waterStatus: WaterStatus;
  daysUntilWatering: number;
  seasonalInterval: number; // adjusted for current season
}

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
