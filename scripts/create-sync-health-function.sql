-- Division sync health report
-- Run this once in your Supabase SQL Editor (or via /api/run-script/create-sync-health-function).
CREATE OR REPLACE FUNCTION public.division_sync_health_report()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $fn$
WITH
headline AS (
  SELECT
    (SELECT COUNT(*) FROM logo_mappings WHERE entity_type = 'college' AND division IS NOT NULL) AS colleges_with_division,
    (SELECT COUNT(DISTINCT btrim(entity_name)) FROM logo_mappings WHERE entity_type = 'college') AS total_colleges,
    (SELECT COUNT(*) FROM athletes) AS total_athletes,
    (SELECT COUNT(*) FROM athletes WHERE division IS NOT NULL AND btrim(division) <> '') AS athletes_with_division
),
raw_mappings AS (
  SELECT id, entity_name, btrim(division) AS division_raw, COALESCE(aliases::text, '') AS aliases_text
  FROM logo_mappings
  WHERE entity_type = 'college' AND division IS NOT NULL
),
canonical_mappings AS (
  SELECT
    id,
    entity_name,
    CASE
      WHEN division_raw ~* '^(ncaa[ ]*)?d[ ]*1$|^division[ ]*i$|^division[ ]*1$|^di$|^d1$' THEN 'NCAA DI'
      WHEN division_raw ~* '^(ncaa[ ]*)?d[ ]*2$|^division[ ]*ii$|^division[ ]*2$|^dii$|^d2$' THEN 'NCAA DII'
      WHEN division_raw ~* '^(ncaa[ ]*)?d[ ]*3$|^division[ ]*iii$|^division[ ]*3$|^diii$|^d3$' THEN 'NCAA DIII'
      WHEN division_raw ~* '^naia$' THEN 'NAIA'
      WHEN division_raw ~* '^njcaa$|^juco$|^junior[ ]*college$' THEN 'NJCAA'
      ELSE division_raw
    END AS division,
    aliases_text
  FROM raw_mappings
),
name_variants AS (
  SELECT
    id,
    division,
    btrim(entity_name) AS entity_name_trimmed,
    CASE
      WHEN aliases_text = '' THEN ARRAY[]::text[]
      ELSE (
        SELECT ARRAY_AGG(btrim(x))
        FROM unnest(
          string_to_array(
            regexp_replace(aliases_text, '[{"}]', '', 'g'),
            ','
          )
        ) AS t(x)
      )
    END AS aliases_arr
  FROM canonical_mappings
),
mapping_surface AS (
  SELECT id, division, ARRAY_REMOVE(ARRAY[entity_name_trimmed] || aliases_arr, NULL) AS all_names
  FROM name_variants
),
normalized_surface AS (
  SELECT
    id,
    division,
    ARRAY_AGG(
      trim(
        regexp_replace(
          regexp_replace(lower(n), '[^a-z0-9 ]', '', 'g'),
          '\s+', ' ', 'g'
        )
      )
    ) AS norm_names
  FROM mapping_surface, unnest(all_names) AS t(n)
  GROUP BY id, division
),
athletes_norm AS (
  SELECT
    a.id,
    a.name,
    a.college,
    a.division AS athlete_division,
    trim(
      regexp_replace(
        regexp_replace(lower(COALESCE(a.college, '')), '[^a-z0-9 ]', '', 'g'
        ),
        '\s+', ' ', 'g'
      )
    ) AS norm_college
  FROM athletes a
),
matched AS (
  SELECT DISTINCT an.id
  FROM athletes_norm an
  JOIN normalized_surface ns
    ON an.norm_college = ANY(ns.norm_names)
),
coverage AS (
  SELECT
    (SELECT COUNT(*) FROM athletes_norm WHERE COALESCE(college, '') <> '') AS with_college,
    (SELECT COUNT(*) FROM matched) AS matched_cnt
),
coverage_json AS (
  SELECT jsonb_build_object(
    'with_college', with_college,
    'matched_cnt', matched_cnt,
    'matched_percent', ROUND(100.0 * matched_cnt / NULLIF(with_college, 0), 2)
  ) AS obj
  FROM coverage
),
non_canonical_rows AS (
  SELECT id, name, college, division
  FROM athletes
  WHERE division IS NOT NULL
    AND btrim(division) <> ''
    AND division NOT IN ('NCAA DI','NCAA DII','NCAA DIII','NAIA','NJCAA')
  ORDER BY id
  LIMIT 100
),
non_canonical_json AS (
  SELECT COALESCE(jsonb_agg(to_jsonb(non_canonical_rows)), '[]'::jsonb) AS arr
  FROM non_canonical_rows
),
mismatch_rows AS (
  SELECT
    an.id AS athlete_id,
    an.name,
    an.college,
    an.athlete_division,
    ns.division AS mapped_division
  FROM athletes_norm an
  JOIN normalized_surface ns
    ON an.norm_college = ANY(ns.norm_names)
  WHERE COALESCE(an.athlete_division, '') <> COALESCE(ns.division, '')
  ORDER BY an.name
  LIMIT 100
),
mismatches_json AS (
  SELECT COALESCE(jsonb_agg(to_jsonb(mismatch_rows)), '[]'::jsonb) AS arr
  FROM mismatch_rows
),
unmatched_rows AS (
  SELECT
    an.norm_college,
    COUNT(*) AS cnt,
    MIN(an.college) AS example_raw
  FROM athletes_norm an
  LEFT JOIN normalized_surface ns
    ON an.norm_college = ANY(ns.norm_names)
  WHERE COALESCE(an.college, '') <> ''
    AND ns.id IS NULL
  GROUP BY an.norm_college
  ORDER BY cnt DESC
  LIMIT 50
),
unmatched_json AS (
  SELECT COALESCE(jsonb_agg(to_jsonb(unmatched_rows)), '[]'::jsonb) AS arr
  FROM unmatched_rows
)
SELECT jsonb_build_object(
  'headline', to_jsonb((SELECT * FROM headline LIMIT 1)),
  'coverage', (SELECT obj FROM coverage_json),
  'non_canonical', (SELECT arr FROM non_canonical_json),
  'mismatches', (SELECT arr FROM mismatches_json),
  'top_unmatched', (SELECT arr FROM unmatched_json)
);
$fn$;

COMMENT ON FUNCTION public.division_sync_health_report() IS
'Returns a JSONB report of division sync coverage, mismatches, and unmatched colleges.';
