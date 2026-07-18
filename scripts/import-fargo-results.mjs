#!/usr/bin/env node
/**
 * Import Fargo Nationals CSV into Supabase `fargo_results`.
 *
 * Supports two CSV layouts:
 * 1. Standard seed — first_name, last_name, event_year, division, weight, wins, losses, placement, …
 * 2. Bracket export — first, last, class, weight, wins, losses, champ_round_wins, furthest_champ_round, …
 *    Name files `fargo_YYYY_16u.csv` or `fargo_YYYY_junior.csv` (or pass --year / --division).
 *
 * Prerequisite: run scripts/create-fargo-results-table.sql in Supabase SQL Editor.
 *
 *   node scripts/import-fargo-results.mjs scripts/data/fargo_results_seed.csv
 *   node scripts/import-fargo-results.mjs scripts/data/fargo/fargo_2024_16u.csv --dry-run
 *   node scripts/import-fargo-results.mjs scripts/data/fargo/*.csv
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")

function loadEnvFile(rel) {
  const p = path.join(root, rel)
  if (!fs.existsSync(p)) return
  const text = fs.readFileSync(p, "utf8")
  for (const line of text.split("\n")) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const eq = t.indexOf("=")
    if (eq <= 0) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    val = val.replace(/\r$/, "").trim()
    if (!process.env[key]) process.env[key] = val
  }
}

loadEnvFile(".env.local")
loadEnvFile(".env")

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "")
  .trim()
  .replace(/\/+$/, "")
const SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim()
const dryRun = process.argv.includes("--dry-run")
const cliYear = parseInt(getArg("--year") ?? "", 10)
const cliDivision = getArg("--division")

const csvPaths = process.argv
  .filter((a) => a.endsWith(".csv"))
  .map((p) => path.resolve(root, p))

if (!csvPaths.length) {
  csvPaths.push(path.resolve(root, "scripts/data/fargo_results_seed.csv"))
}

function getArg(flag) {
  const i = process.argv.indexOf(flag)
  if (i === -1) return null
  return process.argv[i + 1] ?? null
}

function parseCsvLine(line) {
  const out = []
  let cur = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur)
      cur = ""
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out.map((v) => v.trim())
}

function parsePlacement(raw) {
  if (!raw) return null
  const m = String(raw).trim().match(/^(\d+)/)
  return m ? parseInt(m[1], 10) : null
}

const DIVISION_FROM_FILENAME = {
  "16u": "16U Boys Freestyle",
  junior: "Junior Boys Freestyle",
}

function divisionFromFilename(filePath) {
  const base = path.basename(filePath).toLowerCase()
  const m = base.match(/fargo_(\d{4})_(16u|junior)\.csv/)
  if (!m) return { year: Number.isFinite(cliYear) ? cliYear : null, division: cliDivision ?? null }
  return {
    year: parseInt(m[1], 10),
    division: DIVISION_FROM_FILENAME[m[2]] ?? null,
  }
}

function isBracketExportHeader(header) {
  return header.some(
    (h) =>
      h.includes("furthest_champ_round") ||
      h.includes("furthest champ round") ||
      h.includes("champ_round_wins") ||
      h.includes("champ round wins"),
  )
}

function isSummaryExportHeader(header) {
  return header.some((h) => h.includes("fargo_wins") || h.includes("fargo wins") || h.includes("hs_states") || h.includes("hs states"))
}

function buildContextNotes(row) {
  const parts = []
  if (row.class) parts.push(row.class)
  if (row.hs_states) parts.push(`NCHSAA: ${row.hs_states}`)
  if (row.ctt_bb) parts.push(`CTT BB: ${row.ctt_bb}`)
  return parts
}

function buildBracketNotes(row) {
  const parts = buildContextNotes(row)
  if (row.champ_round_wins || row.furthest_champ_round) {
    parts.push(`Champ: ${row.champ_round_wins || 0}W to R${row.furthest_champ_round || "—"}`)
  }
  if (row.consi_wins || row.furthest_consi_round) {
    parts.push(`Consi: ${row.consi_wins || 0}W to ${row.furthest_consi_round || "—"}`)
  }
  if (row.wins_over_seeded || row.losses_to_seeded) {
    parts.push(`vs seeded ${row.wins_over_seeded || 0}-${row.losses_to_seeded || 0}`)
  }
  if (row.seeded_win_notes) parts.push(row.seeded_win_notes)
  if (row.seeded_loss_notes) parts.push(row.seeded_loss_notes)
  return parts.join(" · ") || null
}

function buildSummaryNotes(row) {
  const parts = buildContextNotes(row)
  return parts.join(" · ") || null
}

function parseCsvRecords(raw, meta) {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return { rows: [], divisionScoped: false }

  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase())
  const bracketMode = isBracketExportHeader(header)
  const summaryMode = !bracketMode && isSummaryExportHeader(header)
  const divisionScoped = bracketMode || summaryMode
  const rows = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i])
    const row = {}
    header.forEach((h, j) => {
      row[h] = values[j] ?? ""
    })

    const first = (row.first_name ?? row.first ?? "").trim()
    const last = (row.last_name ?? row.last ?? "").trim()
    if (!first || !last) continue

    const year = parseInt(row.event_year ?? row.year ?? meta.year ?? "", 10)
    if (!year) continue

    const wins = parseInt(row.fargo_wins ?? row.wins ?? "0", 10)
    const losses = parseInt(row.fargo_losses ?? row.losses ?? "0", 10)
    const division = (row.division ?? meta.division ?? "").trim()

    let notes = (row.notes ?? "").trim() || null
    if (bracketMode) notes = buildBracketNotes(row)
    else if (summaryMode) notes = buildSummaryNotes(row)

    rows.push({
      year,
      athlete_name: `${first} ${last}`.trim(),
      first_name: first,
      last_name: last,
      division,
      weight_class: String(row.weight ?? row.weight_class ?? "").trim(),
      wins: Number.isFinite(wins) ? wins : 0,
      losses: Number.isFinite(losses) ? losses : 0,
      record: Number.isFinite(wins) && Number.isFinite(losses) ? `${wins}-${losses}` : "",
      placement: parsePlacement(row.placement),
      is_all_american:
        String(row.is_all_american ?? "").toLowerCase() === "true" || row.is_all_american === true,
      high_school: (row.high_school ?? row.school ?? "").trim() || null,
      notes,
      event_name: (row.event_name ?? "US Marine Corps National Championships (Fargo)").trim(),
      _divisionScoped: divisionScoped,
    })
  }

  return { rows, divisionScoped }
}

function normalizeName(name) {
  return (name ?? "").toString().trim().toLowerCase().replace(/\s+/g, " ")
}

/** Last row wins when the same wrestler appears in multiple CSVs. */
function dedupeFargoRows(rows) {
  const map = new Map()
  for (const row of rows) {
    const key = `${row.year}|${row.division}|${normalizeName(row.athlete_name)}|${row.weight_class}`
    map.set(key, row)
  }
  return [...map.values()]
}

const allParsed = []
const deleteScopes = []

for (const csvPath of csvPaths) {
  if (!fs.existsSync(csvPath)) {
    console.error(`File not found: ${csvPath}`)
    process.exit(1)
  }
  const meta = divisionFromFilename(csvPath)
  const { rows, divisionScoped } = parseCsvRecords(fs.readFileSync(csvPath, "utf8"), meta)
  if (!rows.length) {
    console.warn(`No rows in ${csvPath}`)
    continue
  }
  allParsed.push(...rows)

  const years = [...new Set(rows.map((r) => r.year))]
  for (const year of years) {
    const yearRows = rows.filter((r) => r.year === year)
    const divisions = [...new Set(yearRows.map((r) => r.division).filter(Boolean))]
    if (divisionScoped || divisions.length > 0) {
      for (const division of divisions) {
        deleteScopes.push({ year, division })
      }
    } else {
      deleteScopes.push({ year, division: null })
    }
  }
  const mode = divisionScoped ? "division export" : "standard seed"
  console.log(`Parsed ${rows.length} from ${path.basename(csvPath)} (${mode})`)
}

if (!allParsed.length) {
  console.error("No rows parsed from any CSV")
  process.exit(1)
}

const years = [...new Set(allParsed.map((r) => r.year))].sort()
const deduped = dedupeFargoRows(allParsed)
if (deduped.length !== allParsed.length) {
  console.log(`Deduped ${allParsed.length} → ${deduped.length} rows (same year/division/name/weight)`)
}
console.log(`Total: ${deduped.length} Fargo rows for years: ${years.join(", ")}`)

if (dryRun) {
  console.log("Dry run — sample rows:")
  console.log(deduped.slice(0, 3))
  process.exit(0)
}

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const { createClient } = await import("@supabase/supabase-js")
const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const { data: athletes, error: athletesError } = await supabase.from("athletes").select("name, highschool")
if (athletesError) {
  console.error("Failed to load athletes:", athletesError.message)
  process.exit(1)
}

const nameToSchool = new Map()
for (const a of athletes ?? []) {
  const key = normalizeName(a.name)
  if (!nameToSchool.has(key)) nameToSchool.set(key, (a.highschool ?? "").trim() || null)
}

function resolveHighSchool(csvName) {
  const key = normalizeName(csvName)
  if (nameToSchool.has(key)) return nameToSchool.get(key)
  for (const [athleteKey, school] of nameToSchool) {
    if (athleteKey.includes(key) || key.includes(athleteKey)) return school
  }
  return null
}

const seenDeletes = new Set()
for (const scope of deleteScopes) {
  const key = `${scope.year}|${scope.division ?? "*"}`
  if (seenDeletes.has(key)) continue
  seenDeletes.add(key)

  let q = supabase.from("fargo_results").delete().eq("year", scope.year)
  if (scope.division) q = q.eq("division", scope.division)
  const { error: deleteError } = await q
  if (deleteError) {
    console.error(`Delete failed for ${scope.year}${scope.division ? ` ${scope.division}` : ""}:`, deleteError.message)
    process.exit(1)
  }
  console.log(
    `Deleted existing fargo_results for ${scope.year}${scope.division ? ` · ${scope.division}` : " (all divisions)"}`,
  )
}

const insertRows = deduped.map(({ _divisionScoped, ...r }) => ({
  ...r,
  high_school: r.high_school || resolveHighSchool(r.athlete_name),
}))

const BATCH = 50
let inserted = 0
for (let i = 0; i < insertRows.length; i += BATCH) {
  const batch = insertRows.slice(i, i + BATCH)
  const { error } = await supabase.from("fargo_results").insert(batch)
  if (error) {
    console.error("Insert failed:", error.message)
    process.exit(1)
  }
  inserted += batch.length
}

console.log(`Imported ${inserted} Fargo results from ${csvPaths.length} file(s)`)
