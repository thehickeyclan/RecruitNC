-- Verify Appalachian State mapping and athlete propagation
-- Run this in Supabase SQL Editor.

-- 1) Confirm the mapping rows you edited for Appalachian State
SELECT
  id,
  entity_name,
  entity_type,
  division,
  logo_url,
  updated_at
FROM logo_mappings
WHERE entity_type = 'college'
  AND lower(entity_name) LIKE '%appalachian%'
ORDER BY entity_name;

-- 2) Preview matches (athletes linked to the Appalachian mapping by normalized name)
WITH mapping AS (
  SELECT
    entity_name,
    division AS mapped_division,
    trim(
      regexp_replace(
        regexp_replace(lower(entity_name), '[^a-z0-9 ]', '', 'g'),
        '\s+',
        ' ',
        'g'
      )
    ) AS key
  FROM logo_mappings
  WHERE entity_type = 'college'
    AND division IS NOT NULL
    AND lower(entity_name) LIKE '%appalachian%'
),
athletes_norm AS (
  SELECT
    a.id,
    a.name,
    a.college,
    a.division AS current_division,
    trim(
      regexp_replace(
        regexp_replace(lower(COALESCE(a.college, '')), '[^a-z0-9 ]', '', 'g'),
        '\s+',
        ' ',
        'g'
      )
    ) AS key
  FROM athletes a
)
SELECT
  an.id AS athlete_id,
  an.name AS athlete_name,
  an.college AS athlete_college,
  an.current_division,
  m.mapped_division,
  CASE
    WHEN an.current_division IS NULL THEN 'will set'
    WHEN an.current_division <> m.mapped_division THEN 'will change'
    ELSE 'ok'
  END AS status
FROM athletes_norm an
JOIN mapping m USING (key)
ORDER BY status DESC, athlete_college, athlete_name
LIMIT 200;

-- 3) Summary counts for Appalachian State athletes
WITH mapping AS (
  SELECT
    trim(
      regexp_replace(
        regexp_replace(lower(entity_name), '[^a-z0-9 ]', '', 'g'),
        '\s+',
        ' ',
        'g'
      )
    ) AS key,
    division AS mapped_division
  FROM logo_mappings
  WHERE entity_type = 'college'
    AND division IS NOT NULL
    AND lower(entity_name) LIKE '%appalachian%'
),
athletes_norm AS (
  SELECT
    a.id,
    trim(
      regexp_replace(
        regexp_replace(lower(COALESCE(a.college, '')), '[^a-z0-9 ]', '', 'g'),
        '\s+',
        ' ',
        'g'
      )
    ) AS key,
    a.division AS current_division
  FROM athletes a
)
SELECT
  COUNT(*) FILTER (WHERE an.key = m.key) AS matched_athletes,
  COUNT(*) FILTER (WHERE an.key = m.key AND an.current_division IS NULL) AS null_divisions_after_update_should_be_0,
  COUNT(*) FILTER (WHERE an.key = m.key AND an.current_division <> m.mapped_division) AS mismatches_after_update_should_be_0
FROM athletes_norm an
JOIN mapping m USING (key);

-- 4) Sanity check for likely variations not covered by exact normalization
-- If you see rows here, consider adding an alias (e.g., "App State") to the mapping row.
SELECT
  a.id AS athlete_id,
  a.name AS athlete_name,
  a.college AS athlete_college,
  a.division AS current_division
FROM athletes a
WHERE
  (a.college ILIKE '%appalachian%' OR a.college ILIKE '%app state%')
  AND NOT EXISTS (
    SELECT 1
    FROM logo_mappings lm
    WHERE lm.entity_type = 'college'
      AND lm.division IS NOT NULL
      AND trim(
        regexp_replace(
          regexp_replace(lower(COALESCE(a.college, '')), '[^a-z0-9 ]', '', 'g'
        ),
        '\s+',
        ' ',
        'g'
      )) = trim(
        regexp_replace(
          regexp_replace(lower(lm.entity_name), '[^a-z0-9 ]', '', 'g'
        ),
        '\s+',
        ' ',
        'g'
      ))
  )
ORDER BY athlete_college, athlete_name
LIMIT 200;
