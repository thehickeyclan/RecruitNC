-- Commitment intake (Matt, 26 October 2026): anyone can report a commitment - the wrestler, a
-- parent, a college coach - and Matt approves it from a texted link.
--
-- The old table required gender, class year and high school typed by hand; the form now points at
-- a profile and reads those from it, and a report about a wrestler with no profile yet may not
-- know them. Who reported it, how to reach them, the day it was announced and the college row it
-- resolved to are new. Review fields record what approval did.

alter table public.commitment_submissions
  alter column graduation_year drop not null,
  alter column gender drop not null,
  alter column high_school drop not null;

alter table public.commitment_submissions
  add column if not exists college_id uuid references public.colleges(id) on delete set null,
  add column if not exists commitment_date date,
  add column if not exists college_weight_class text,
  add column if not exists submitter_name text,
  add column if not exists submitter_role text,
  add column if not exists submitter_contact text,
  add column if not exists submitter_user_id uuid,
  add column if not exists reviewed_at timestamptz,
  add column if not exists applied_athlete_id uuid,
  add column if not exists announced_at timestamptz;

create index if not exists commitment_submissions_status_idx on public.commitment_submissions (status, submitted_at desc);
