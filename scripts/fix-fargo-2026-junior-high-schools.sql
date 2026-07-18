-- Backfill verified high schools for 2026 Fargo Junior Boys Freestyle rows.
-- These rows were imported from Fargo aggregate CSVs that did not include high_school.

update public.fargo_results
set high_school = v.high_school,
    updated_at = now()
from (
  values
    ('Joshua Stonebraker', 'Cary Christian'),
    ('Charles Thompson', 'Mallard Creek'),
    ('Denys Tsap', 'Cary'),
    ('Benjamin Green', 'Chapel Hill'),
    ('Everon Riddle', 'A.L. Brown')
) as v(athlete_name, high_school)
where public.fargo_results.year = 2026
  and public.fargo_results.division = 'Junior Boys Freestyle'
  and lower(trim(public.fargo_results.athlete_name)) = lower(trim(v.athlete_name));
