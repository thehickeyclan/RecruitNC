#!/usr/bin/env node
/**
 * Import Fargo Nationals CSV into Supabase `fargo_results`.
 *
 * Prerequisite: run scripts/create-fargo-results-table.sql in Supabase SQL Editor.
 *
 *   node scripts/import-fargo-results.mjs scripts/data/fargo_results_seed.csv
 *   node scripts/import-fargo-results.mjs scripts/data/fargo_results_seed.csv --dry-run
 */

import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"
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
const csvPath = path.resolve(root, process.argv.find((a) => a.endsWith(".csv")) || "scripts/data/fargo_results_seed.csv")

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
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

function parseCsvRecords(raw) {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []
  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase())
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i])
    const row = {}
    header.forEach((h, j) => {
      row[h] = values[j] ?? ""
    })
    const year = parseInt(row.event_year ?? row.year ?? "", 10)
    const first = (row.first_name ?? "").trim()
    const last = (row.last_name ?? "").trim()
    if (!year || !first || !last) continue
    const wins = parseInt(row.wins ?? "0", 10)
    const losses = parseInt(row.losses ?? "0", 10)
    rows.push({
      year,
      athlete_name: `${first} ${last}`.trim(),
      first_name: first,
      last_name: last,
      division: (row.division ?? "").trim(),
      weight_class: String(row.weight ?? row.weight_class ?? "").trim(),
      wins: Number.isFinite(wins) ? wins : 0,
      losses: Number.isFinite(losses) ? losses : 0,
      record: Number.isFinite(wins) && Number.isFinite(losses) ? `${wins}-${losses}` : "",
      placement: parsePlacement(row.placement),
      is_all_american:
        String(row.is_all_american ?? "").toLowerCase() === "true" || row.is_all_american === true,
      notes: (row.notes ?? "").trim() || null,
      event_name: (row.event_name ?? "US Marine Corps National Championships (Fargo)").trim(),
    })
  }
  return rows
}

function normalizeName(name) {
  return (name ?? "").toString().trim().toLowerCase().replace(/\s+/g, " ")
}

const raw = fs.readFileSync(csvPath, "utf8")
const parsed = parseCsvRecords(raw)
if (!parsed.length) {
  console.error(`No rows parsed from ${csvPath}`)
  process.exit(1)
}

const years = [...new Set(parsed.map((r) => r.year))].sort()
console.log(`Parsed ${parsed.length} Fargo rows for years: ${years.join(", ")}`)

if (dryRun) {
  console.log("Dry run — sample rows:")
  console.log(parsed.slice(0, 3))
  process.exit(0)
}

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

for (const year of years) {
  const { error: deleteError } = await supabase.from("fargo_results").delete().eq("year", year)
  if (deleteError) {
    console.error(`Delete failed for ${year}:`, deleteError.message)
    process.exit(1)
  }
  console.log(`Deleted existing fargo_results for ${year}`)
}

const insertRows = parsed.map((r) => ({
  ...r,
  high_school: resolveHighSchool(r.athlete_name),
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

console.log(`Imported ${inserted} Fargo results from ${path.basename(csvPath)}`)
