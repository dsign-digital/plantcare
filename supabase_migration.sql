-- ═══════════════════════════════════════════════════════
-- PlantCare – Supabase Database Migration
-- Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ───────────────────────────────────────────
-- PROFILES TABLE
-- ───────────────────────────────────────────
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  is_premium boolean not null default false,
  premium_expires_at timestamptz,
  revenuecat_customer_id text,
  scan_count_this_month integer not null default 0,
  scan_count_reset_at timestamptz not null default now(),
  notification_time text not null default '08:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ───────────────────────────────────────────
-- PLANTS TABLE
-- ───────────────────────────────────────────
create table public.plants (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  scientific_name text,
  common_name text,
  image_url text,
  watering_interval_days integer not null default 7,
  water_amount_ml integer not null default 200,
  last_watered_at timestamptz,
  next_watering_at timestamptz not null default now(),
  room text,
  notes text,
  plant_id_data jsonb,
  -- Seasonal multipliers (1.0 = no change, 0.8 = water more often, 1.5 = water less often)
  season_spring_multiplier numeric(3,2) not null default 1.0,
  season_summer_multiplier numeric(3,2) not null default 0.8,
  season_autumn_multiplier numeric(3,2) not null default 1.2,
  season_winter_multiplier numeric(3,2) not null default 1.5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ───────────────────────────────────────────
-- WATERING LOGS TABLE
-- ───────────────────────────────────────────
create table public.watering_logs (
  id uuid primary key default uuid_generate_v4(),
  plant_id uuid references public.plants(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  watered_at timestamptz not null default now(),
  water_amount_ml integer not null default 200,
  notes text,
  created_at timestamptz not null default now()
);

-- ───────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ───────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.plants enable row level security;
alter table public.watering_logs enable row level security;

-- Profiles: users can only see/edit their own
create policy "profiles: own read" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles: own update" on public.profiles
  for update using (auth.uid() = id);
create policy "profiles: own insert" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles: own delete" on public.profiles
  for delete using (auth.uid() = id);

-- Plants: users can only CRUD their own plants
create policy "plants: own all" on public.plants
  for all using (auth.uid() = user_id);

-- Watering logs: users can only CRUD their own logs
create policy "watering_logs: own all" on public.watering_logs
  for all using (auth.uid() = user_id);

-- ───────────────────────────────────────────
-- TRIGGERS
-- ───────────────────────────────────────────

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute procedure public.handle_updated_at();
create trigger plants_updated_at before update on public.plants
  for each row execute procedure public.handle_updated_at();

-- ───────────────────────────────────────────
-- STORAGE BUCKET FOR PLANT IMAGES
-- ───────────────────────────────────────────
insert into storage.buckets (id, name, public) values ('plant-images', 'plant-images', true);

create policy "plant images: authenticated upload" on storage.objects
  for insert with check (bucket_id = 'plant-images' and auth.role() = 'authenticated');
create policy "plant images: public read" on storage.objects
  for select using (bucket_id = 'plant-images');
create policy "plant images: owner delete" on storage.objects
  for delete using (bucket_id = 'plant-images' and auth.uid()::text = (storage.foldername(name))[1]);
