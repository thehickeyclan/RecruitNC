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

function trimEnv(s) {
  return (s ?? "").replace(/^\s+|\s+$/g, "").replace(/\r/g, "").trim()
}

function explainErr(err) {
  const parts = [err?.message || String(err)]
  let c = err?.cause
  let depth = 0
  while (c && depth++ < 5) {
    if (c?.message) parts.push(`cause: ${c.message}`)
    else if (typeof c === "string") parts.push(`cause: ${c}`)
    else if (c?.code) parts.push(`cause: ${c.code}`)
    c = c?.cause
  }
  return parts.join(" | ")
}

const SUPABASE_URL_RAW = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)
const SERVICE_KEY = trimEnv(process.env.SUPABASE_SERVICE_ROLE_KEY)
const SUPABASE_URL = SUPABASE_URL_RAW.replace(/\/+$/, "")

const args = process.argv.slice(2).filter((a) => a !== "--dry-run")
const dryRun = process.argv.includes("--dry-run")
const jsonPath = path.resolve(root, args[0] || "scripts/data/seniors-2026-nhsca-import.json")

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY in .env.local or .env")
  process.exit(1)
}

let supabaseHost = ""
try {
  supabaseHost = new URL(SUPABASE_URL).hostname
  if (!/^https:/i.test(SUPABASE_URL)) {
    console.error("Supabase URL must start with https:// (got:", SUPABASE_URL.slice(0, 24) + "…)")
    process.exit(1)
  }
} catch {
  console.error("Invalid NEXT_PUBLIC_SUPABASE_URL — not a valid URL:", SUPABASE_URL.slice(0, 60))
  process.exit(1)
}

const hostLower = supabaseHost.toLowerCase()
if (
  hostLower.includes("your-project") ||
  hostLower === "example.supabase.co" ||
  hostLower.startsWith("xxxxxxxx")
) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL is still a documentation placeholder, not your real project URL.",
  )
  console.error(
    "Fix: Supabase dashboard → Project Settings → API → copy “Project URL” (https://<random-letters>.supabase.co) into .env.local",
  )
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
console.log(`Supabase: ${supabaseHost}`)

if (dryRun) {
  process.exit(0)
}

/** Quick HTTPS check — clearer than Supabase’s generic "fetch failed". */
async function probeSupabase() {
  const url = `${SUPABASE_URL}/rest/v1/nhsca_placements?select=id&limit=1`
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
    })
    return { ok: true, status: res.status }
  } catch (e) {
    return { ok: false, err: e }
  }
}

const probe = await probeSupabase()
if (!probe.ok) {
  console.error("Cannot reach Supabase (network/TLS/DNS):", explainErr(probe.err))
  console.error("Checks: Wi‑Fi/VPN, typo in URL, corporate SSL (try another network), or run:")
  console.error('  NODE_OPTIONS=--dns-result-order=ipv4first npm run nhsca:import -- scripts/data/seniors-2026-nhsca-import.json')
  process.exit(1)
}
if (probe.status === 401 || probe.status === 403) {
  console.error("HTTP", probe.status, "— SUPABASE_SERVICE_ROLE_KEY is wrong or not the service_role JWT.")
  process.exit(1)
}
if (probe.status === 404) {
  console.error("HTTP 404 — check NEXT_PUBLIC_SUPABASE_URL (wrong project ref?).")
  process.exit(1)
}
if (probe.status < 200 || probe.status >= 300) {
  console.error("Unexpected HTTP", probe.status, "from Supabase REST — fix URL or key before retrying.")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  global: {
    fetch: (url, options = {}) =>
      fetch(url, { ...options, signal: AbortSignal.timeout(120_000) }),
  },
})

const { error: delErr } = await supabase.from("nhsca_placements").delete().eq("year", year).eq("state", state)

if (delErr) {
  console.error("Delete existing rows:", delErr.message, delErr.details || "")
  process.exit(1)
}

const { data, error: insErr } = await supabase.from("nhsca_placements").insert(formatted).select("id")

if (insErr) {
  console.error("Insert failed:", insErr.message, insErr.details || "")
  process.exit(1)
}

const placers = formatted.filter((p) => p.placement != null && !Number.isNaN(p.placement)).length
console.log(`Done. Inserted ${data?.length ?? formatted.length} (${placers} with placement, ${formatted.length - placers} participants).`)
console.log("Next: run match/merge from admin once, or add a script that calls the match RPCs if you want that automated too.")
