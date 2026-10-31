-- Command Center: the recruiting path, visits and reminders (28 Oct 2026).
--
-- 1. college_list_items.coach_emailed_at: the family opened or copied a coach email from the
--    composer, or ticked "Emailed" on the reach-out checklist. Emails go out through the family's
--    own mail app (a mailto link), so this is the only record that one was sent.
-- 2. recruiting_visits: a visit the family plans - school, official or unofficial, dates, who is
--    going, notes. After the date the Command Center asks whether it happened; "yes" logs a visit
--    in college_contacts and moves the school forward on My College List.
-- 3. family_reminders: a reminder a parent schedules for a date and time, optionally tied to a
--    school, a visit or an interest form. Sent by app push and email from /api/cron/family-reminders,
--    and only once FAMILY_REMINDER_SEND=1 is set.
--
-- school_id is the college map's id (lib/college-programs), not a foreign key: the program list is
-- a file, replaced each season. Server-only: RLS on, no policies, browser roles revoked; every read
-- and write goes through the API routes with the service role.
--
-- Safe to run more than once.

alter table public.college_list_items add column if not exists coach_emailed_at timestamptz;

create table if not exists public.recruiting_visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  athlete_id uuid not null references public.athletes (id) on delete cascade,
  school_id text not null,
  kind text not null check (kind in ('official', 'unofficial')),
  starts_on date not null,
  ends_on date check (ends_on is null or ends_on >= starts_on),
  who text check (who is null or char_length(who) <= 200),
  notes text check (notes is null or char_length(notes) <= 2000),
  outcome text not null default 'planned' check (outcome in ('planned', 'happened', 'missed')),
  contact_id uuid references public.college_contacts (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recruiting_visits_user_idx on public.recruiting_visits (user_id, starts_on);
create index if not exists recruiting_visits_athlete_idx on public.recruiting_visits (athlete_id, starts_on);

alter table public.recruiting_visits enable row level security;
revoke all on public.recruiting_visits from anon, authenticated;

create table if not exists public.family_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  athlete_id uuid references public.athletes (id) on delete cascade,
  school_id text,
  visit_id uuid references public.recruiting_visits (id) on delete cascade,
  -- What it is about: a school in general, a visit, or that school's interest form.
  topic text not null default 'note' check (topic in ('note', 'school', 'visit', 'form')),
  remind_at timestamptz not null,
  note text not null check (char_length(note) between 1 and 300),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- The cron reads what is due and not yet sent.
create index if not exists family_reminders_due_idx on public.family_reminders (remind_at) where sent_at is null;
create index if not exists family_reminders_user_idx on public.family_reminders (user_id, remind_at);

alter table public.family_reminders enable row level security;
revoke all on public.family_reminders from anon, authenticated;
