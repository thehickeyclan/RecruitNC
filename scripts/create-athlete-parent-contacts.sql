-- Parent or guardian contact on a wrestler's profile (Matt, 30 Oct 2026).
-- Its own table, never a column on athletes: profile feeds select athletes.*, and this must reach only
-- the wrestler's parent, college coaches and admins (app/api/athletes/[id]/parent-contact). No RLS
-- policies: only the server key reads or writes it.
create table if not exists public.athlete_parent_contacts (
  athlete_id uuid primary key references public.athletes(id) on delete cascade,
  name text,
  email text,
  phone text,
  updated_by uuid,
  updated_at timestamptz not null default now()
);
alter table public.athlete_parent_contacts enable row level security;
