-- LIFE OS 365 — run once in Supabase SQL Editor

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  timezone text not null default 'Asia/Kolkata',
  currency text not null default 'INR',
  program_start date not null default '2026-10-06',
  program_end date not null default '2027-10-05',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  domain text not null default 'Personal',
  priority text not null default 'Medium',
  impact int not null default 3 check (impact between 1 and 5),
  status text not null default 'planned',
  planned_date date,
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  entry_date date not null,
  hour_slot int,
  category text not null default 'Other',
  title text not null,
  duration_min int default 60,
  productivity int check (productivity is null or productivity between 1 and 5),
  created_at timestamptz not null default now()
);

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  domain text default 'Personal',
  is_active boolean default true,
  created_at timestamptz not null default now()
);

create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  log_date date not null,
  completed boolean not null default false,
  unique (habit_id, log_date)
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  domain text not null,
  target_value numeric default 100,
  current_value numeric default 0,
  status text default 'not_started',
  created_at timestamptz not null default now()
);

create table if not exists public.daily_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  record_date date not null,
  deep_work_hours numeric default 0,
  learning_hours numeric default 0,
  dsa_count int default 0,
  fitness_done boolean default false,
  sports_done boolean default false,
  content_done boolean default false,
  energy int default 3 check (energy between 1 and 5),
  wake_on_time boolean default false,
  no_social boolean default false,
  expense_logged boolean default false,
  accomplishments text,
  tomorrow_priority text,
  score int default 0,
  submitted boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, record_date)
);

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  workout_date date not null,
  activity_type text not null,
  duration_min int,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  expense_date date not null,
  amount numeric(12,2) not null,
  category text not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.investment_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  symbol text not null,
  name text not null,
  asset_class text not null default 'Equity',
  quantity numeric(18,6) not null default 0,
  avg_cost numeric(18,4) not null default 0,
  current_price numeric(18,4) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_tasks_user_date on public.tasks(user_id, planned_date);
create index if not exists idx_daily_user_date on public.daily_records(user_id, record_date);
create index if not exists idx_time_user_date on public.time_entries(user_id, entry_date);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.time_entries enable row level security;
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;
alter table public.goals enable row level security;
alter table public.daily_records enable row level security;
alter table public.workouts enable row level security;
alter table public.expenses enable row level security;
alter table public.investment_holdings enable row level security;

drop policy if exists "profiles_own" on public.profiles;
drop policy if exists "tasks_own" on public.tasks;
drop policy if exists "time_own" on public.time_entries;
drop policy if exists "habits_own" on public.habits;
drop policy if exists "habit_logs_own" on public.habit_logs;
drop policy if exists "goals_own" on public.goals;
drop policy if exists "daily_own" on public.daily_records;
drop policy if exists "workouts_own" on public.workouts;
drop policy if exists "expenses_own" on public.expenses;
drop policy if exists "invest_own" on public.investment_holdings;

create policy "profiles_own" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "tasks_own" on public.tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "time_own" on public.time_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "habits_own" on public.habits for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "habit_logs_own" on public.habit_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "goals_own" on public.goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "daily_own" on public.daily_records for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "workouts_own" on public.workouts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "expenses_own" on public.expenses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "invest_own" on public.investment_holdings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
