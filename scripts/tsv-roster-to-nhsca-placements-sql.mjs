#!/usr/bin/env node
/**
 * Paste your Tab-separated nhsca_roster export (header row) into a .tsv file, then:
 *
 *   node scripts/tsv-roster-to-nhsca-placements-sql.mjs scripts/data/your-roster.tsv > scripts/sql/out.sql
 *
 * Produces INSERT INTO nhsca_placements for year=2026 NC with extended columns.
 * Run migration 001-extend-nhsca-placements-roster-columns.sql first if needed.
 */
import fs from "fs"

const path = process.argv[2]
if (!path || !fs.existsSync(path)) {
  console.error("Usage: node scripts/tsv-roster-to-nhsca-placements-sql.mjs <file.tsv>")
  process.exit(1)
}

const raw = fs.readFileSync(path, "utf8")
const lines = raw.split(/\r?\n/).filter((l) => l.trim().length)

function esc(s) {
  if (s == null || s === undefined) return "NULL"
  const t = String(s).trim()
  if (t === "" || t.toLowerCase() === "null") return "NULL"
  return `'${t.replace(/'/g, "''")}'`
}

function numOrNull(s) {
  const t = String(s ?? "").trim()
  if (t === "") return "NULL"
  const n = parseInt(t, 10)
  return Number.isFinite(n) ? String(n) : "NULL"
}

const header = lines[0].split("\t").map((h) => h.trim())
const idx = (name) => header.indexOf(name)

const I = {
  id: idx("id"),
  name: idx("name"),
  weight_class: idx("weight_class"),
  gender: idx("gender"),
  classification: idx("classification"),
  school: idx("school"),
  wins: idx("wins"),
  losses: idx("losses"),
  seed: idx("seed"),
  placement: idx("placement"),
  bracket_status: idx("bracket_status"),
  notable_wins: idx("notable_wins"),
  notable_win_count: idx("notable_win_count"),
  bracket_side: idx("bracket_side"),
  current_round: idx("current_round"),
  seeded_wins: idx("seeded_wins"),
  seeded_losses: idx("seeded_losses"),
  furthest_consi_round: idx("furthest_consi_round"),
}

const year = 2026
const state = "NC"
const source = "roster_paste_2026_nc"

const rows = []
for (let i = 1; i < lines.length; i++) {
  const parts = lines[i].split("\t")
  const get = (j) => (j >= 0 && j < parts.length ? parts[j] : "")

  const name = get(I.name).trim()
  if (!name) continue

  const w = parseInt(get(I.wins), 10) || 0
  const l = parseInt(get(I.losses), 10) || 0
  const record = `${w}-${l}`

  let placementSql = "NULL"
  const pl = String(get(I.placement) ?? "").trim()
  if (pl !== "" && /^\d+$/.test(pl)) placementSql = pl

  const rid = get(I.id).trim()
  const rosterIdSql = rid && /^[0-9a-f-]{36}$/i.test(rid) ? `'${rid.replace(/'/g, "''")}'::uuid` : "NULL"

  rows.push(
    `(${year}, ${esc(name)}, ${get(I.school).trim() ? esc(get(I.school)) : "NULL"}, ${placementSql}, ${esc(
      get(I.weight_class),
    )}, ${esc(get(I.classification))}, ${esc(record)}, ${esc(state)}, 'unmatched', ${esc(source)}, ${get(I.gender).trim() ? esc(get(I.gender)) : "NULL"}, ${numOrNull(
      get(I.wins),
    )}, ${numOrNull(get(I.losses))}, ${numOrNull(get(I.seed))}, ${get(I.bracket_status).trim() ? esc(get(I.bracket_status)) : "NULL"}, ${get(I.bracket_side).trim() ? esc(get(I.bracket_side)) : "NULL"}, ${get(I.current_round).trim() ? esc(get(I.current_round)) : "NULL"}, ${numOrNull(get(I.seeded_wins))}, ${numOrNull(get(I.seeded_losses))}, ${get(I.furthest_consi_round).trim() ? esc(get(I.furthest_consi_round)) : "NULL"}, ${get(I.notable_wins).trim() ? esc(get(I.notable_wins)) : "NULL"}, ${numOrNull(get(I.notable_win_count))}, ${rosterIdSql})`,
  )
}

const out = `-- Generated from TSV → nhsca_placements (no nhsca_roster table required)
-- Source tag: ${source}
BEGIN;

DELETE FROM nhsca_placements
WHERE year = ${year} AND state = '${state}' AND source = '${source}';

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
VALUES
${rows.join(",\n")};

COMMIT;
`

process.stdout.write(out)
process.stderr.write(`Wrote ${rows.length} rows for year=${year} state=${state} source=${source}\n`)
