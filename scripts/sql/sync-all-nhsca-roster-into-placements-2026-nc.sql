-- =============================================================================
-- Copy nhsca_roster (live 2026 NC dashboard) → nhsca_placements (full columns).
-- Run AFTER: scripts/sql/migrations/001-extend-nhsca-placements-roster-columns.sql
--
-- Replaces ONLY rows: year=2026, state=NC, source=sync_from_nhsca_roster_2026
-- =============================================================================

BEGIN;

DELETE FROM nhsca_placements
WHERE year = 2026
  AND state = 'NC'
  AND source = 'sync_from_nhsca_roster_2026';

INSERT INTO nhsca_placements (
  year,
  athlete_name,
  high_school,
  placement,
  weight_class,
  division,
  record,
  state,
  match_status,
  source,
  gender,
  wins,
  losses,
  seed,
  bracket_status,
  bracket_side,
  current_round,
  seeded_wins,
  seeded_losses,
  furthest_consi_round,
  notable_wins,
  notable_win_count,
  nhsca_roster_id
)
SELECT
  2026,
  TRIM(r.name::text),
  NULLIF(TRIM(COALESCE(r.school::text, '')), ''),
  CASE
    WHEN r.placement IS NULL THEN NULL
    WHEN NULLIF(TRIM(r.placement::text), '') IS NULL THEN NULL
    WHEN TRIM(r.placement::text) ~ '^[0-9]+$' THEN TRIM(r.placement::text)::int
    ELSE NULL
  END,
  TRIM(COALESCE(r.weight_class::text, '')),
  TRIM(COALESCE(r.classification::text, '')),
  CONCAT(COALESCE(r.wins, 0)::text, '-', COALESCE(r.losses, 0)::text),
  'NC',
  'unmatched',
  'sync_from_nhsca_roster_2026',
  NULLIF(TRIM(COALESCE(r.gender::text, '')), ''),
  r.wins::integer,
  r.losses::integer,
  CASE
    WHEN r.seed IS NULL THEN NULL
    WHEN NULLIF(TRIM(r.seed::text), '') IS NULL THEN NULL
    WHEN TRIM(r.seed::text) ~ '^[0-9]+$' THEN TRIM(r.seed::text)::int
    ELSE NULL
  END,
  NULLIF(TRIM(COALESCE(r.bracket_status::text, '')), ''),
  NULLIF(TRIM(COALESCE(r.bracket_side::text, '')), ''),
  NULLIF(TRIM(COALESCE(r.current_round::text, '')), ''),
  r.seeded_wins::integer,
  r.seeded_losses::integer,
  NULLIF(TRIM(COALESCE(r.furthest_consi_round::text, '')), ''),
  NULLIF(TRIM(COALESCE(r.notable_wins::text, '')), ''),
  r.notable_win_count::integer,
  r.id
FROM nhsca_roster r
WHERE TRIM(COALESCE(r.name::text, '')) <> '';

COMMIT;
