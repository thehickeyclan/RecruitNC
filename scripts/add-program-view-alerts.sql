-- College-interest iPhone alerts: "Washington and Jefferson College viewed Liam's profile."
--
-- 1. Tie a registered phone to the account signed in on it. Devices were anonymous (one row per
--    Expo token), which cannot express "this wrestler's family". The app sends its session when
--    it registers; the server sets user_id, and clears it on sign-out.
-- 2. Each phone's opt-in, on by default: it only ever fires for the family's own wrestler.
-- 3. One alert per program per wrestler per week; the unique key makes repeats a no-op.
--
-- Safe to run more than once.

alter table public.push_devices
  add column if not exists user_id uuid references auth.users (id) on delete set null;

alter table public.push_devices
  add column if not exists alert_program_views boolean not null default true;

comment on column public.push_devices.user_id is
  'Account signed in on this phone when it last registered; null when signed out. Used for alerts about a family''s own wrestler.';
comment on column public.push_devices.alert_program_views is
  'Send this phone a push when a verified college coach opens a linked wrestler''s profile (program named, never the coach).';

create index if not exists push_devices_user_id_idx
  on public.push_devices (user_id)
  where user_id is not null;

create table if not exists public.push_sent_program_views (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes (id) on delete cascade,
  program text not null,
  week_start date not null,
  recipients integer not null default 0,
  sent_at timestamptz not null default now(),
  unique (athlete_id, program, week_start)
);

-- Written and read only by the server with the service role.
alter table public.push_sent_program_views enable row level security;
