-- Correct Joshua Stonebraker's 2026 Fargo aggregate.
-- Source confirmation: Joshua Stonebraker went 3-2 at 2026 Fargo.

update public.fargo_results
set
  wins = 3,
  losses = 2,
  record = '3-2',
  notes = '3-2 per confirmation.',
  updated_at = now()
where year = 2026
  and lower(trim(first_name)) = 'joshua'
  and lower(trim(last_name)) = 'stonebraker'
  and division = 'Junior Boys Freestyle'
  and weight_class = '157';

-- Fallback for older rows that may not have first_name/last_name populated.
update public.fargo_results
set
  wins = 3,
  losses = 2,
  record = '3-2',
  notes = '3-2 per confirmation.',
  updated_at = now()
where year = 2026
  and lower(trim(athlete_name)) = 'joshua stonebraker'
  and division = 'Junior Boys Freestyle'
  and weight_class = '157';
