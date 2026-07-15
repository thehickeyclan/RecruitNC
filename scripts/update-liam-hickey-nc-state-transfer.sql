-- Liam Hickey: current college NC State; keep UNC Chapel Hill as transfer history.
-- Run AFTER scripts/athletes-previous-college.sql
-- Athlete id from public profile / Data Dawg feedback.

update public.athletes
set
  college = 'NC State',
  previous_college = 'UNC Chapel Hill',
  updated_at = coalesce(updated_at, now())
where id = 'ed26dd22-9533-4acf-ade7-577b41b03337';

-- Optional: align name-based commit row if present (legacy table).
update public.wrestling_commits
set
  college = 'NC State',
  notes = trim(
    both from concat_ws(
      E'\n',
      nullif(trim(coalesce(notes, '')), ''),
      'Transferred from UNC Chapel Hill to NC State.'
    )
  )
where athlete_name ilike '%liam%hickey%'
  and (
    college is null
    or college ilike '%north carolina%'
    or college ilike '%unc%'
    or college ilike '%nc state%'
  );

-- Verify
select id, name, college, previous_college, division, recruiting_status
from public.athletes
where id = 'ed26dd22-9533-4acf-ade7-577b41b03337';
