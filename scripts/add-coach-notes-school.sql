-- Recruiting file notes (app/my-recruits/[athleteId], lib/recruiting/recruit-notes.ts), 2 Nov 2026.
-- A note belongs to the program it was written for: every coach of that school reads it, a coach
-- who moves schools does not take it along. Server-only table: RLS on, nothing granted to the
-- browser roles; the app reads and writes it with the service role.

alter table public.coach_athlete_notes add column if not exists school_id uuid;

update public.coach_athlete_notes n
   set school_id = p.school_id
  from public.user_profiles p
 where p.user_id = n.coach_user_id
   and n.school_id is null
   and p.school_id is not null;

create index if not exists coach_athlete_notes_school_athlete_idx
  on public.coach_athlete_notes (school_id, athlete_id, created_at desc);
create index if not exists coach_athlete_notes_coach_athlete_idx
  on public.coach_athlete_notes (coach_user_id, athlete_id);

alter table public.coach_athlete_notes enable row level security;
revoke all on public.coach_athlete_notes from anon, authenticated;
