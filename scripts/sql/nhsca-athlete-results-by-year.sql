-- =============================================================================
-- NHSCA — THREE tables (your Supabase):
--   nhsca_roster            = LIVE dashboard (2026 event: wins/losses, seed, Consi)
--   nhsca_placements        = bulk imports (e.g. 2025 Freshman 4th)
--   wrestling_nhsca_results = legacy
--
-- 2026 Aaron Ellison (Sophomore, 5-2, seed 3, Consi8) lives on nhsca_roster —
-- NOT on nhsca_placements unless you also import a 2026 placements row.
-- Query roster for live; query placements for import history.
-- =============================================================================

-- LIVE 2026 (nhsca_roster) — Ellison
SELECT
  id,
  name,
  weight_class,
  classification,
  wins,
  losses,
  seed,
  placement,
  bracket_status,
  seeded_wins,
  seeded_losses,
  furthest_consi_round,
  created_at
FROM nhsca_roster
WHERE name ILIKE '%Ellison%'
ORDER BY name;

-- Placements (imports)
SELECT athlete_name, year, division, weight_class, placement, record, state
FROM nhsca_placements
WHERE athlete_name ILIKE '%Ellison%'
ORDER BY year DESC;

-- Legacy
SELECT athlete_name, year, division, weight, placement, state, high_school
FROM wrestling_nhsca_results
WHERE athlete_name ILIKE '%Ellison%'
ORDER BY year DESC;
