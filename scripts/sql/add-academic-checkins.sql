-- Academic check-ins on the Command Center (Matt, 6 Nov 2026): GPA update reminders after each
-- report card, and "has he taken the SAT or ACT?" when both scores are blank.
--
-- The scores and the GPA themselves stay on athletes (academic_gpa, academic_sat, academic_act;
-- the GPA's date comes from the athletes_academic_gpa_updated_at trigger). This table holds only
-- what the family told us that isn't a score: "still the same GPA", "signed up for the SAT on
-- March 14", "not yet", "not planning to". One row per wrestler, shared by the family's logins.
--
-- Server-only: written and read with the service role from /api/my-recruiting/academics and the
-- Command Center home. No grants to anon or authenticated, as private as the GPA itself.

create table if not exists public.academic_checkins (
  athlete_id uuid primary key references public.athletes(id) on delete cascade,
  -- "Still 3.50": the family confirmed the GPA after new grades without changing it.
  gpa_confirmed_at timestamptz,
  -- Tests, while both scores are blank: not_yet | planned | not_taking.
  test_status text check (test_status in ('not_yet', 'planned', 'not_taking')),
  test_kind text check (test_kind in ('sat', 'act')),
  test_date date,
  -- When the family last answered the test question (re-asks are timed from here).
  test_answered_at timestamptz,
  updated_by uuid,
  updated_at timestamptz not null default now()
);

alter table public.academic_checkins enable row level security;
revoke all on public.academic_checkins from anon, authenticated;
