-- Sync Aaron Ellison 2026 from nhsca_roster into nhsca_placements (same table as 2025 import rows).
-- Roster: Sophomore 145, 5-2, seed 3, Consi8. Official AA placement not set on roster row → NULL here.
-- Run in Supabase SQL Editor.

DELETE FROM nhsca_placements
WHERE athlete_name = 'Aaron Ellison'
  AND year = 2026
  AND division = 'Sophomore'
  AND state = 'NC';

INSERT INTO nhsca_placements (
  year,
  tournament_name,
  athlete_name,
  high_school,
  state,
  placement,
  weight_class,
  division,
  record,
  athlete_id,
  match_status,
  match_confidence,
  match_method,
  source
) VALUES (
  2026,
  'NHSCA National Championship',
  'Aaron Ellison',
  'Lumberton',
  'NC',
  NULL,
  '145',
  'Sophomore',
  '5-2',
  'a31bf725-32b8-4550-aff5-c74c59d97311'::uuid,
  'auto_matched',
  1.00,
  'exact_name',
  'sync_from_nhsca_roster_2026'
);

-- Copy this pattern for other kids: DELETE same keys → INSERT from roster (wins-losses as record, weight_class, division, year=2026).
