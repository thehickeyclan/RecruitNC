-- Staff activity: who changed what on a program's shared recruiting board
-- (lib/recruiting/board-events.ts writes it, lib/recruiting/staff-activity.ts reads it).
-- Server-only: row level security is on with no policies, so only the service role reaches it.
create table if not exists public.recruiting_board_events (
  id uuid primary key default gen_random_uuid(),
  school_id uuid,
  actor_user_id uuid not null,
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  kind text not null check (kind in ('added', 'removed', 'stage', 'applied')),
  detail text,
  created_at timestamptz not null default now()
);
create index if not exists recruiting_board_events_actor_idx on public.recruiting_board_events (actor_user_id, created_at desc);
create index if not exists recruiting_board_events_athlete_idx on public.recruiting_board_events (athlete_id);
alter table public.recruiting_board_events enable row level security;
