// Sync athletes.division from logo_mappings (college) using aliases.
// - Matches on normalized college names (entity_name + aliases) vs athletes.college.
// - Only updates when the value differs. Safe to re-run.
// - Logs the number of rows updated.
//
// How to run (in v0):
// - Use the script runner with this file selected, or
// - Use the admin page at /admin/run-sync
//
// Requires POSTGRES_URL in the environment.

import { neon } from "@neondatabase/serverless"

async function main() {
  const connectionString = process.env.POSTGRES_URL
  if (!connectionString) {
    console.error("POSTGRES_URL is not set.")
    process.exit(1)
  }

  const sql = neon(connectionString)

  // Single-statement version (no explicit BEGIN/COMMIT) for serverless compatibility.
  const query = `
WITH raw_mappings AS (
  SELECT
    id,
    entity_name,
    division,
    CASE WHEN aliases IS NULL THEN '' ELSE aliases::text END AS aliases_text
  FROM logo_mappings
  WHERE entity_type = 'college' AND division IS NOT NULL
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
  FROM raw_mappings
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
          '\\s+', ' ', 'g'
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
        '\\s+', ' ', 'g'
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
SELECT COUNT(*)::int AS rows_updated FROM updated;
  `.trim()

  console.log("Running division sync...")
  const rows = await sql(query)
  const rowsUpdated = rows?.[0]?.rows_updated ?? 0
  console.log("Sync completed. Rows updated:", rowsUpdated)
}

main().catch((err) => {
  console.error("Sync failed:", err)
  process.exit(1)
})
