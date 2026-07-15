-- Alumni college facts for Data Dawg (often NO athletes profile / pre–class of 2025).
-- Source of truth for these lookups: wrestling_commits (no high_school column on this table).

-- 1) See what exists today
select athlete_name, college, level, graduation_year, notes
from public.wrestling_commits
where athlete_name ilike any (array['Josh Wilson', 'Jason Gore', 'Liam Hickey'])
order by athlete_name, graduation_year nulls last;

-- 2) Josh Wilson → Greensboro College
update public.wrestling_commits
set college = 'Greensboro College'
where athlete_name ilike 'Josh Wilson';

insert into public.wrestling_commits (athlete_name, college, level)
select 'Josh Wilson', 'Greensboro College', 'NCAA D3'
where not exists (
  select 1 from public.wrestling_commits where athlete_name ilike 'Josh Wilson'
);

-- 3) Jason Gore → NC State University
update public.wrestling_commits
set college = 'North Carolina State University'
where athlete_name ilike 'Jason Gore';

insert into public.wrestling_commits (athlete_name, college, level)
select 'Jason Gore', 'North Carolina State University', 'NCAA D1'
where not exists (
  select 1 from public.wrestling_commits where athlete_name ilike 'Jason Gore'
);

-- 4) Confirm
select athlete_name, college, level, graduation_year, notes
from public.wrestling_commits
where athlete_name ilike any (array['Josh Wilson', 'Jason Gore', 'Liam Hickey'])
order by athlete_name;
