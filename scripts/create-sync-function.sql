-- Creates or replaces a Postgres function to sync athletes.division
-- from logo_mappings (entity_type='college'), respecting aliases and
-- normalizing names. Returns the number of rows updated.
-- Run this once in your Supabase SQL editor.

CREATE OR REPLACE FUNCTION public.sync_athlete_divisions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows_updated integer := 0;
BEGIN
  WITH raw_mappings AS (
    SELECT
      id,
      entity_name,
      btrim(division) AS division_raw,
      CASE WHEN aliases IS NULL THEN '' ELSE aliases::text END AS aliases_text
    FROM logo_mappings
    WHERE entity_type = 'college'
      AND division IS NOT NULL
      AND btrim(division) <> ''
  ),
  -- Canonicalize mapping divisions into our standard set
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
            regexp_replace(lower(n), '[^a-z0-9 ]', '', 'g'
            ),
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
  candidates AS (
    SELECT
      an.id AS athlete_id,
      ns.division AS mapped_division
    FROM athletes_norm an
    JOIN normalized_surface ns
      ON an.norm_college = ANY(ns.norm_names)
  ),
  updated AS (
    UPDATE athletes a
    SET division = c.mapped_division
    FROM candidates c
    WHERE a.id = c.athlete_id
      AND COALESCE(a.division, '') IS DISTINCT FROM COALESCE(c.mapped_division, '')
    RETURNING a.id
  )
  SELECT COUNT(*) INTO v_rows_updated FROM updated;

  RETURN v_rows_updated;
END;
$$;

COMMENT ON FUNCTION public.sync_athlete_divisions() IS
'Sync athletes.division using logo_mappings (college + aliases). Returns rows updated.';

-- Optional: allow authenticated calls (not needed if you call via service role).
-- GRANT EXECUTE ON FUNCTION public.sync_athlete_divisions() TO anon, authenticated;
