#!/usr/bin/env node
/**
 * nhsca import JSON → SQL for Supabase (same rows as bulk-import API).
 *
 * Usage:
 *   node scripts/nhsca-json-to-sql.mjs scripts/data/seniors-2026-nhsca-import.json > out.sql
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

const rows = placements.map((p) => {
  const pl = p.placement === null || p.placement === undefined ? "NULL" : Number(p.placement)
  const placementSql = pl === null || Number.isNaN(pl) ? "NULL" : pl
  return `(${p.year ?? year}, ${sqlVal(p.athlete_name)}, ${p.high_school == null ? "NULL" : sqlVal(p.high_school)}, ${placementSql}, ${sqlVal(p.weight_class)}, ${sqlVal(p.division)}, ${p.record == null ? "NULL" : sqlVal(p.record)}, ${sqlVal(p.state || state)}, 'unmatched', ${sqlVal(`bulk_import_${year}`)})`
})

const sql = `-- Generated from ${jsonPath}
-- Same effect as POST /api/admin/nhsca-placements/bulk-import (delete 2026 NC then insert)

DELETE FROM nhsca_placements WHERE year = ${year} AND state = '${state}';

INSERT INTO nhsca_placements (year, athlete_name, high_school, placement, weight_class, division, record, state, match_status, source)
VALUES
${rows.join(",\n")};
`

process.stdout.write(sql)
process.stderr.write(`${placements.length} rows, year=${year}\n`)
