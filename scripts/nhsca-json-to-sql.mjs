#!/usr/bin/env node
/**
 * NHSCA import JSON → SQL for Supabase (same rows as bulk-import API).
 *
 * With **full names** that match `athletes.name` (or name variants), profiles pick up NHSCA via
 * `getNHSCAFromTables` — no Auto-Match / athlete_id required for display.
 *
 * Usage:
 *   node scripts/nhsca-json-to-sql.mjs scripts/data/seniors-2026-nhsca-import.json > scripts/data/seniors-2026-nhsca-placements.sql
 *   node scripts/nhsca-json-to-sql.mjs scripts/data/juniors-2026-nhsca-import.json > scripts/data/juniors-2026-nhsca-placements.sql
 *
 * DELETE is scoped to year + state + **division** in the file (Senior vs Junior), so you do not wipe the other division.
 *
 * Paste the SQL into Supabase SQL Editor and run.
 */

import fs from "fs"

const jsonPath = process.argv[2]
if (!jsonPath || !fs.existsSync(jsonPath)) {
  console.error("Usage: node scripts/nhsca-json-to-sql.mjs <import.json>")
  process.exit(1)
}

const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"))
const placements = data.placements
const year = data.year ?? 2026
const state = "NC"

function esc(s) {
  if (s == null || s === undefined) return null
  return String(s).replace(/'/g, "''")
}
function sqlVal(s) {
  if (s == null || s === undefined) return "NULL"
  return `'${esc(s)}'`
}

const uniqDivisions = [...new Set(placements.map((p) => p.division).filter(Boolean))]
const deleteSql = uniqDivisions
  .map((d) => `DELETE FROM nhsca_placements WHERE year = ${year} AND state = '${state}' AND division = '${esc(d)}';`)
  .join("\n")

const rows = placements.map((p) => {
  const pl = p.placement === null || p.placement === undefined ? "NULL" : Number(p.placement)
  const placementSql = pl === null || Number.isNaN(pl) ? "NULL" : pl
  return `(${p.year ?? year}, ${sqlVal(p.athlete_name)}, ${p.high_school == null ? "NULL" : sqlVal(p.high_school)}, ${placementSql}, ${sqlVal(p.weight_class)}, ${sqlVal(p.division)}, ${p.record == null ? "NULL" : sqlVal(p.record)}, ${sqlVal(p.state || state)}, 'unmatched', ${sqlVal(`bulk_import_${year}`)})`
})

const sql = `-- Generated from ${jsonPath}
-- Deletes only ${uniqDivisions.join(", ")} for ${year} NC, then inserts (same as bulk-import API).

${deleteSql}

INSERT INTO nhsca_placements (year, athlete_name, high_school, placement, weight_class, division, record, state, match_status, source)
VALUES
${rows.join(",\n")};
`

process.stdout.write(sql)
process.stderr.write(`${placements.length} rows, year=${year}, division(s): ${uniqDivisions.join(", ")}\n`)
