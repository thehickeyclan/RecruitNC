-- When a profile's name, wrestling name, class, school, club or state changes, results already on file
-- may belong to it. The hourly link job (/api/cron/link-results) looks for profiles changed since its
-- last run, but nothing kept athletes.updated_at current, so a wrestling-name edit went unnoticed.
-- This stamps the time those fields change, whatever writes them.

alter table public.athletes add column if not exists identity_changed_at timestamptz;

create or replace function public.athletes_stamp_identity_change()
returns trigger
language plpgsql
as $$
begin
  if new.name is distinct from old.name
     or new.wrestling_name is distinct from old.wrestling_name
     or new.graduationyear is distinct from old.graduationyear
     or new.highschool is distinct from old.highschool
     or new."wrestlingClub" is distinct from old."wrestlingClub"
     or new.state is distinct from old.state then
    new.identity_changed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists athletes_stamp_identity_change on public.athletes;
create trigger athletes_stamp_identity_change
  before update on public.athletes
  for each row execute function public.athletes_stamp_identity_change();
