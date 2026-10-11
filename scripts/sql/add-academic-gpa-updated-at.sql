-- When a wrestler's GPA was last changed, for the profile ("GPA 3.8, updated Oct 11, 2026").
--
-- Set by a trigger rather than by each save path: the GPA is written from the profile editor,
-- the profile-setup wizard, the iPhone app, admin edits and approved edit requests, and a date
-- that only some of them remembered to set would be wrong half the time.
--
-- No backfill. A GPA entered before today has no known date, and the profile shows none rather
-- than inventing one. Not granted to anon/authenticated: it is as private as the GPA itself.

alter table public.athletes add column if not exists academic_gpa_updated_at timestamptz;

create or replace function public.set_academic_gpa_updated_at()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.academic_gpa is not null then
      new.academic_gpa_updated_at := now();
    end if;
  elsif new.academic_gpa is distinct from old.academic_gpa then
    new.academic_gpa_updated_at := case when new.academic_gpa is null then null else now() end;
  end if;
  return new;
end;
$$;

drop trigger if exists athletes_academic_gpa_updated_at on public.athletes;
create trigger athletes_academic_gpa_updated_at
  before insert or update of academic_gpa on public.athletes
  for each row execute function public.set_academic_gpa_updated_at();
