-- Nhịp — personal health & fitness tracker
-- Every table is owned by a user and protected by Row Level Security.
-- user_id defaults to auth.uid() and the WITH CHECK clauses reject any
-- attempt to write a row for somebody else, so the client never decides user_id.

-- gen_random_uuid() is built into Postgres 13+ (no extension needed).

-- ───────────────────────── profiles ─────────────────────────
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  age int not null check (age between 13 and 110),
  sex text not null check (sex in ('male','female')),
  height_cm numeric(5,1) not null check (height_cm between 100 and 250),
  weight_kg numeric(5,1) not null check (weight_kg between 30 and 300),
  target_weight_kg numeric(5,1),
  weekly_change_kg numeric(3,2),
  activity_level text not null check (activity_level in ('sedentary','light','moderate','very','athlete')),
  goal text not null check (goal in ('lose_weight','maintain','gain_weight','build_muscle','improve_fitness')),
  daily_calorie_target int not null,
  daily_protein_target int not null,
  daily_carbs_target int not null,
  daily_fat_target int not null,
  daily_water_target_ml int not null default 2500,
  daily_step_goal int not null default 10000,
  daily_exercise_goal_min int not null default 30,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ───────────────────────── meals & food ─────────────────────────
create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  meal_type text not null check (meal_type in ('breakfast','lunch','dinner','snack','other')),
  logged_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  meal_id uuid references public.meals(id) on delete cascade,
  meal_type text not null check (meal_type in ('breakfast','lunch','dinner','snack','other')),
  logged_at timestamptz not null default now(),
  food_name text not null,
  quantity numeric(8,2) not null default 1,
  unit text not null default 'serving',
  calories numeric(7,1) not null check (calories >= 0),
  protein_g numeric(6,1) not null default 0 check (protein_g >= 0),
  carbs_g numeric(6,1) not null default 0 check (carbs_g >= 0),
  fat_g numeric(6,1) not null default 0 check (fat_g >= 0),
  confidence text check (confidence in ('low','medium','high')),
  ai_estimated boolean not null default false,
  ai_assumptions jsonb,
  ai_original_calories numeric(7,1),
  created_at timestamptz not null default now()
);

-- Personal food memory: what this user actually logs for a given food name.
create table if not exists public.user_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  normalized_name text not null,
  calories numeric(7,1) not null,
  protein_g numeric(6,1) not null default 0,
  carbs_g numeric(6,1) not null default 0,
  fat_g numeric(6,1) not null default 0,
  unit text not null default 'serving',
  times_logged int not null default 1,
  updated_at timestamptz not null default now(),
  unique (user_id, normalized_name)
);

-- ───────────────────────── activity & body ─────────────────────────
create table if not exists public.exercise_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  activity text not null,
  duration_minutes int not null check (duration_minutes > 0 and duration_minutes <= 1440),
  distance_km numeric(6,2),
  intensity text not null default 'moderate' check (intensity in ('light','moderate','vigorous')),
  heart_rate_avg int,
  calories_burned numeric(7,1) not null check (calories_burned >= 0),
  ai_estimated boolean not null default false,
  confidence text check (confidence in ('low','medium','high')),
  notes text,
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  amount_ml int not null check (amount_ml > 0 and amount_ml <= 5000),
  logged_at timestamptz not null default now()
);

create table if not exists public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  weight_kg numeric(5,1) not null check (weight_kg between 30 and 300),
  body_fat_percentage numeric(4,1),
  muscle_mass_kg numeric(5,1),
  logged_at timestamptz not null default now()
);

create table if not exists public.sleep_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  bedtime timestamptz,
  wake_time timestamptz,
  duration_minutes int not null check (duration_minutes > 0 and duration_minutes <= 1440),
  quality int check (quality between 1 and 5),
  logged_at timestamptz not null default now()
);

create table if not exists public.step_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  steps int not null check (steps >= 0 and steps <= 200000),
  source text not null default 'manual',
  logged_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  content text not null,
  logged_at timestamptz not null default now()
);

-- ───────────────────────── indexes ─────────────────────────
create index if not exists food_logs_user_time on public.food_logs (user_id, logged_at desc);
create index if not exists meals_user_time on public.meals (user_id, logged_at desc);
create index if not exists exercise_logs_user_time on public.exercise_logs (user_id, logged_at desc);
create index if not exists water_logs_user_time on public.water_logs (user_id, logged_at desc);
create index if not exists weight_logs_user_time on public.weight_logs (user_id, logged_at desc);
create index if not exists sleep_logs_user_time on public.sleep_logs (user_id, logged_at desc);
create index if not exists step_logs_user_time on public.step_logs (user_id, logged_at desc);
create index if not exists notes_user_time on public.notes (user_id, logged_at desc);

-- ───────────────────────── row level security ─────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','meals','food_logs','user_foods','exercise_logs',
    'water_logs','weight_logs','sleep_logs','step_logs','notes'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('drop policy if exists "own rows select" on public.%I', t);
    execute format('drop policy if exists "own rows insert" on public.%I', t);
    execute format('drop policy if exists "own rows update" on public.%I', t);
    execute format('drop policy if exists "own rows delete" on public.%I', t);
    execute format('create policy "own rows select" on public.%I for select to authenticated using (user_id = auth.uid())', t);
    execute format('create policy "own rows insert" on public.%I for insert to authenticated with check (user_id = auth.uid())', t);
    execute format('create policy "own rows update" on public.%I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('create policy "own rows delete" on public.%I for delete to authenticated using (user_id = auth.uid())', t);
  end loop;
end $$;

-- A food log may only point at a meal owned by the same user.
create or replace function public.check_meal_owner() returns trigger
language plpgsql security invoker as $$
begin
  if new.meal_id is not null and not exists (
    select 1 from public.meals m where m.id = new.meal_id and m.user_id = new.user_id
  ) then
    raise exception 'meal does not belong to user';
  end if;
  return new;
end $$;

drop trigger if exists food_logs_meal_owner on public.food_logs;
create trigger food_logs_meal_owner before insert or update on public.food_logs
  for each row execute function public.check_meal_owner();

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
