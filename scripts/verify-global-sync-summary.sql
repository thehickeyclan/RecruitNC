-- Global verification summary (read-only).
-- Confirms mapping coverage and previews any pending changes.

WITH raw_mappings AS (
  SELECT
    id,
    entity_name,
    division,
    CASE
      WHEN aliases IS NULL THEN ''
      ELSE regexp_replace(aliases::text, '[{"}]', '', 'g')
    END AS aliases_text
  FROM logo_mappings
  WHERE entity_type = 'college'
),
name_variants AS (
  SELECT
    id,
    division,
    btrim(entity_name) AS entity_name_trimmed,
    CASE
      WHEN aliases_text = '' THEN ARRAY[]::text[]
      ELSE (
        SELECT ARRAY_AGG(btrim(x)) FROM unnest(string_to_array(aliases_text, ',')) AS t(x)
      )
    END AS aliases_arr
  FROM raw_mappings
),
mapping_surface AS (
  SELECT
    id,
    division,
    ARRAY_REMOVE(ARRAY[entity_name_trimmed] || aliases_arr, NULL) AS all_names
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
    a.division AS current_division,
    trim(
      regexp_replace(
        regexp_replace(lower(COALESCE(a.college, '')), '[^a-z0-9 ]', '', 'g'
        ),
        '\s+', ' ', 'g'
      )
    ) AS norm_college
  FROM athletes a
),
join_preview AS (
  SELECT
    an.id AS athlete_id,
    an.name AS athlete_name,
    an.college AS athlete_college,
    an.current_division,
    ns.division AS mapped_division
  FROM athletes_norm an
  LEFT JOIN normalized_surface ns
    ON an.norm_college = ANY(ns.norm_names)
)

-- 1) Totals
SELECT 'TOTALS' AS section,
       COUNT(*) AS total_athletes,
       COUNT(*) FILTER (WHERE current_division IS NULL OR current_division = '') AS athletes_with_blank_division
FROM join_preview;

-- 2) Coverage
SELECT 'COVERAGE' AS section,
       COUNT(*) FILTER (WHERE mapped_division IS NOT NULL) AS matched,
       COUNT(*) FILTER (WHERE mapped_division IS NULL) AS unmatched,
       ROUND(100.0 * COUNT(*) FILTER (WHERE mapped_division IS NOT NULL) / NULLIF(COUNT(*),0), 2) AS matched_percent
FROM join_preview;

-- 3) Top unmatched colleges (need alias or mapping)
SELECT 'TOP_UNMATCHED' AS section,
       athlete_college,
       COUNT(*) AS athlete_count
FROM join_preview
WHERE mapped_division IS NULL
GROUP BY athlete_college
ORDER BY athlete_count DESC, athlete_college NULLS LAST
LIMIT 100;

-- 4) Mappings missing a division (should be empty now)
SELECT 'MAPPINGS_MISSING_DIVISION' AS section,
       entity_name
FROM logo_mappings
WHERE entity_type = 'college' AND (division IS NULL OR division = '')
ORDER BY entity_name
LIMIT 200;

-- 5) Preview of rows that would change if you re-run the sync now
SELECT 'WOULD_CHANGE' AS section,
       athlete_id,
       athlete_name,
       athlete_college,
       current_division,
       mapped_division
FROM join_preview
WHERE mapped_division IS NOT NULL
  AND COALESCE(current_division, '') <> mapped_division
ORDER BY athlete_college, athlete_name
LIMIT 200;

-- 6) Canonical check (DI, DII, DIII, NAIA, NJCAA)
WITH canon AS (
  SELECT unnest(ARRAY['DI','DII','DIII','NAIA','NJCAA']) AS c
)
SELECT 'NON_CANONICAL_IN_ATHLETES' AS section,
       current_division,
       COUNT(*) AS athlete_count
FROM join_preview jp
LEFT JOIN canon ON jp.current_division = canon.c
WHERE (jp.current_division IS NOT NULL AND jp.current_division <> '')
  AND canon.c IS NULL
GROUP BY current_division
ORDER BY athlete_count DESC, current_division;
