-- Coach → prospect messaging (decided 7 Oct 2026).
--
-- One conversation per college coach per wrestler. The coach always speaks first; the wrestler
-- and every linked parent see the whole thread and may reply inside it, never start one.
--
-- Every table is server-only: RLS on, no policies, browser roles revoked. All reads and writes
-- go through /api/coach-messages with the service role, the same lockdown as
-- parent_athlete_links — a thread between an adult and a minor must never be readable or
-- writable from a browser with the anon key.
--
-- Safe to run more than once.

create table if not exists public.coach_threads (
  id uuid primary key default gen_random_uuid(),
  coach_user_id uuid not null references auth.users (id) on delete cascade,
  athlete_id uuid not null references public.athletes (id) on delete cascade,
  -- The coach's program when the thread opened, so a later profile edit does not rewrite history.
  program text,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  -- "Stop messages from this coach": the family's off switch. The coach can no longer send.
  stopped_at timestamptz,
  stopped_by_user_id uuid references auth.users (id) on delete set null,
  unique (coach_user_id, athlete_id)
);

create index if not exists coach_threads_athlete_idx on public.coach_threads (athlete_id, last_message_at desc);
create index if not exists coach_threads_coach_idx on public.coach_threads (coach_user_id, last_message_at desc);

create table if not exists public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.coach_threads (id) on delete cascade,
  sender_user_id uuid references auth.users (id) on delete set null,
  -- Who was speaking, fixed at send time: 'coach', 'athlete' or 'parent'.
  sender_role text not null check (sender_role in ('coach', 'athlete', 'parent')),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists coach_messages_thread_idx on public.coach_messages (thread_id, created_at);
create index if not exists coach_messages_sender_idx on public.coach_messages (sender_user_id, created_at desc);

create table if not exists public.coach_thread_reads (
  thread_id uuid not null references public.coach_threads (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);

-- App Store guideline 1.2: reports must be acted on within 24 hours. No FK to the reporter or
-- the thread, so the audit row survives an account or thread being removed.
create table if not exists public.coach_message_reports (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid,
  message_id uuid,
  reporter_user_id uuid,
  reason text,
  status text not null default 'open' check (status in ('open', 'resolved')),
  resolution text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists coach_message_reports_open_idx on public.coach_message_reports (status, created_at);

alter table public.coach_threads enable row level security;
alter table public.coach_messages enable row level security;
alter table public.coach_thread_reads enable row level security;
alter table public.coach_message_reports enable row level security;

revoke all on public.coach_threads, public.coach_messages, public.coach_thread_reads, public.coach_message_reports
  from anon, authenticated;

-- Each phone's opt-in for message alerts, on by default: it only ever fires for a conversation
-- the account signed in on that phone is part of.
alter table public.push_devices
  add column if not exists alert_messages boolean not null default true;

comment on column public.push_devices.alert_messages is
  'Send this phone a push when a college coach messages a linked wrestler, or a family replies to this coach.';
