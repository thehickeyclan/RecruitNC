-- =============================================================================
-- NHSCA — ONE query for any kid (placements + legacy). Paste in Supabase SQL.
-- =============================================================================
-- 1) Change ONLY the name pattern below (ILIKE, so % wildcards work).
-- 2) Run once. You get every row we store for that name from both tables.
--
-- Does NOT use nhsca_roster (many projects don't have that table). If you add
-- roster later, duplicate the UNION block with SELECT ... FROM nhsca_roster.
-- =============================================================================

WITH params AS (
  SELECT '%Vincent Valentino%'::text AS athlete_name_ilike
)
SELECT *
FROM (
  SELECT
    p.year,
    p.athlete_name,
    p.division,
    COALESCE(p.weight_class, '')::text AS weight,
    p.placement,
    p.record,
    COALESCE(p.state, '')::text AS state,
    p.high_school,
    p.source,
    p.athlete_id,
    p.match_status,
    'nhsca_placements'::text AS source_table
  FROM nhsca_placements p
  CROSS JOIN params x
  WHERE p.athlete_name ILIKE x.athlete_name_ilike

  UNION ALL

  SELECT
    w.year,
    w.athlete_name,
    w.division,
    COALESCE(w.weight, '')::text AS weight,
    w.placement,
    NULL::text AS record,
    COALESCE(w.state, '')::text AS state,
    w.high_school,
    NULL::text AS source,
    NULL::uuid AS athlete_id,
    NULL::text AS match_status,
    'wrestling_nhsca_results'::text AS source_table
  FROM wrestling_nhsca_results w
  CROSS JOIN params x
  WHERE w.athlete_name ILIKE x.athlete_name_ilike
) combined
ORDER BY year DESC NULLS LAST, source_table, division NULLS LAST, weight;
