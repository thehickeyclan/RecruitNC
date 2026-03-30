#!/usr/bin/env node
/**
 * Load NHSCA placements JSON into Supabase — same as /api/admin/nhsca-placements/bulk-import
 * but no browser, no admin session, no pasting megabytes into a textarea.
 *
 * From project root (Recruit-NC-main), with .env.local containing
 * NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
 *
 *   node scripts/import-nhsca-placements.mjs scripts/data/seniors-2026-nhsca-import.json
 *
 * Dry run (no DB writes):
 *
 *   node scripts/import-nhsca-placements.mjs path/to/import.json --dry-run
 */

import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")

function loadEnvLocal() {
  const p = path.join(root, ".env.local")
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
    if (!process.env[key]) process.env[key] = val
  }
}

loadEnvLocal()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const args = process.argv.slice(2).filter((a) => a !== "--dry-run")
const dryRun = process.argv.includes("--dry-run")
const jsonPath = path.resolve(root, args[0] || "scripts/data/seniors-2026-nhsca-import.json")

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}

if (!fs.existsSync(jsonPath)) {
  console.error("File not found:", jsonPath)
  process.exit(1)
}

const { year: bodyYear = 2025, placements } = JSON.parse(fs.readFileSync(jsonPath, "utf8"))

if (!Array.isArray(placements) || placements.length === 0) {
  console.error("Invalid JSON: need { placements: [...] }")
  process.exit(1)
}

const formatted = placements.map((row) => {
  const rawPl = row.placement != null && row.placement !== "" ? parseInt(String(row.placement), 10) : null
  const placement = Number.isFinite(rawPl) ? rawPl : null
  return {
  year: row.year || bodyYear,
  athlete_name: String(row.athlete_name ?? "").trim(),
  high_school: row.high_school?.trim() || null,
  placement,
  weight_class: String(row.weight_class ?? "").trim(),
  division: String(row.division ?? "").trim(),
  record: row.record?.trim() || null,
  state: (row.state?.trim() || "NC").toUpperCase() === "NC" ? "NC" : String(row.state).trim(),
  match_status: "unmatched",
  source: `bulk_import_${row.year || bodyYear}`,
  }
})

const bad = formatted.filter((p) => !p.athlete_name || !p.weight_class || !p.division)
if (bad.length) {
  console.error(`${bad.length} rows missing athlete_name, weight_class, or division`)
  process.exit(1)
}

const year = formatted[0].year
const state = formatted[0].state

console.log(`Rows: ${formatted.length}  year=${year}  state=${state}  dryRun=${dryRun}`)

if (dryRun) {
  process.exit(0)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const { error: delErr } = await supabase.from("nhsca_placements").delete().eq("year", year).eq("state", state)

if (delErr) {
  console.error("Delete existing rows:", delErr.message)
  process.exit(1)
}

const { data, error: insErr } = await supabase.from("nhsca_placements").insert(formatted).select("id")

if (insErr) {
  console.error("Insert failed:", insErr.message)
  process.exit(1)
}

const placers = formatted.filter((p) => p.placement != null && !Number.isNaN(p.placement)).length
console.log(`Done. Inserted ${data?.length ?? formatted.length} (${placers} with placement, ${formatted.length - placers} participants).`)
console.log("Next: run match/merge from admin once, or add a script that calls the match RPCs if you want that automated too.")
