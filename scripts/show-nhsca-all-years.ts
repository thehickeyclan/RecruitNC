#!/usr/bin/env tsx
/**
 * Every NHSCA year for an athlete across all DB sources + profile merge (same as unified profile).
 *
 * Run in your project TERMINAL (not in Supabase SQL Editor — that only runs SQL).
 *
 *   npm run nhsca:all-years
 *   npm run nhsca:all-years -- "Aaron Ellison" 2028
 *   npm run nhsca:all-years -- "Aaron Ellison" 2028 a31bf725-32b8-4550-aff5-c74c59d97311
 *
 * Requires .env.local: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { createClient } from "@supabase/supabase-js"
import { getNHSCAForAthlete } from "../lib/public-profile-data"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

function loadEnvFile(rel: string) {
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

function trimEnv(s: string | undefined) {
  return (s ?? "").replace(/^\s+|\s+$/g, "").replace(/\r/g, "").trim()
}

const ROSTER_DEFAULT_YEAR = 2026

function explainFetchErr(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (msg.includes("fetch failed") || msg.includes("FetchError") || msg.includes("ECONNREFUSED")) {
    return `${msg}\n  → Check VPN/network, that NEXT_PUBLIC_SUPABASE_URL is https://….supabase.co, and SUPABASE_SERVICE_ROLE_KEY is set (no extra quotes).`
  }
  return msg
}

function rosterTournamentYear(r: Record<string, unknown>): number {
  const y = r.tournament_year ?? r.nhsca_year ?? r.year
  if (y != null && y !== "") {
    const n = typeof y === "number" ? y : parseInt(String(y), 10)
    if (Number.isFinite(n) && n >= 1990 && n <= 2100) return n
  }
  return ROSTER_DEFAULT_YEAR
}

const url = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL).replace(/\/+$/, "")
const key = trimEnv(process.env.SUPABASE_SERVICE_ROLE_KEY)

const args = process.argv.slice(2).filter((a) => !a.startsWith("-"))
const displayName = args[0]?.trim() || "Aaron Ellison"
const gradYear = args[1] ? parseInt(args[1], 10) : 2028
const athleteId = args[2]?.trim()

async function main() {
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
    process.exit(1)
  }
  if (!Number.isFinite(gradYear)) {
    console.error("Invalid graduation year")
    process.exit(1)
  }

  const supabase = createClient(url, key)
  const ilikeName = `%${displayName}%`

  let host = url
  try {
    host = new URL(url).host
  } catch {
    /* ignore */
  }

  console.log("=".repeat(72))
  console.log(`NHSCA — all sources for: "${displayName}" (grad ${gradYear})`)
  console.log(`Supabase host: ${host}`)
  console.log("=".repeat(72))

  // --- What the profile shows (roster → placements → legacy + athlete JSON) ---
  const athlete: Record<string, unknown> = {
    name: displayName,
    graduationyear: gradYear,
  }
  if (athleteId) athlete.id = athleteId

  let profileNhsca: Awaited<ReturnType<typeof getNHSCAForAthlete>> = []
  console.log("\n## PROFILE (getNHSCAForAthlete — use this for “did the app get every year?”)\n")
  try {
    profileNhsca = await getNHSCAForAthlete(supabase, athlete)
    console.log(JSON.stringify(profileNhsca, null, 2))
  } catch (e) {
    console.log(`[error] ${explainFetchErr(e)}`)
  }
  const profileYears = [...new Set(profileNhsca.map((r) => r.year))].sort((a, b) => b - a)
  console.log(`\nYears in profile merge: ${profileYears.join(", ") || "(none)"}`)

  // --- Raw: nhsca_placements (all years) ---
  let plData: { year?: number }[] = []
  let roData: Record<string, unknown>[] = []
  let legData: { year?: number }[] = []

  try {
    const res = await supabase
      .from("nhsca_placements")
      .select("year, athlete_name, division, weight_class, placement, record, state, source")
      .ilike("athlete_name", ilikeName)
      .order("year", { ascending: false })
    if (!res.error) plData = (res.data ?? []) as { year?: number }[]
    console.log("\n## nhsca_placements (imports — every row)\n")
    if (res.error?.code === "42P01") console.log("(table missing)\n")
    else if (res.error) console.log(explainFetchErr(res.error), "\n")
    else console.log(JSON.stringify(res.data ?? [], null, 2))
  } catch (e) {
    console.log("\n## nhsca_placements (imports — every row)\n")
    console.log(explainFetchErr(e), "\n")
  }

  // --- Raw: nhsca_roster (live; year from columns or default 2026) ---
  try {
    const ro = await supabase.from("nhsca_roster").select("*").ilike("name", ilikeName)
    if (!ro.error) roData = (ro.data ?? []) as Record<string, unknown>[]
    console.log("\n## nhsca_roster (live dashboard — tournament year shown as resolved year)\n")
    if (ro.error?.code === "42P01") console.log("(table missing)\n")
    else if (ro.error) console.log(explainFetchErr(ro.error), "\n")
    else {
      const rows = (ro.data ?? []) as Record<string, unknown>[]
      const enriched = rows.map((r) => ({
        ...r,
        _resolved_tournament_year: rosterTournamentYear(r),
      }))
      console.log(JSON.stringify(enriched, null, 2))
    }
  } catch (e) {
    console.log("\n## nhsca_roster (live dashboard — tournament year shown as resolved year)\n")
    console.log(explainFetchErr(e), "\n")
  }

  // --- Raw: wrestling_nhsca_results ---
  try {
    const leg = await supabase
      .from("wrestling_nhsca_results")
      .select("year, athlete_name, division, weight, placement, state, high_school")
      .ilike("athlete_name", ilikeName)
      .order("year", { ascending: false })
    if (!leg.error) legData = (leg.data ?? []) as { year?: number }[]
    console.log("\n## wrestling_nhsca_results (legacy)\n")
    if (leg.error?.code === "42P01") console.log("(table missing)\n")
    else if (leg.error) console.log(explainFetchErr(leg.error), "\n")
    else console.log(JSON.stringify(leg.data ?? [], null, 2))
  } catch (e) {
    console.log("\n## wrestling_nhsca_results (legacy)\n")
    console.log(explainFetchErr(e), "\n")
  }

  // --- Combined year list (raw) ---
  const years = new Set<number>()
  for (const r of plData) {
    const y = r.year
    if (typeof y === "number") years.add(y)
  }
  for (const r of roData) {
    years.add(rosterTournamentYear(r))
  }
  for (const r of legData) {
    const y = r.year
    if (typeof y === "number") years.add(y)
  }

  const rawYears = [...years].sort((a, b) => b - a)
  console.log("\n## Summary\n")
  console.log(`Years found in raw tables (any name match): ${rawYears.join(", ") || "(none)"}`)
  console.log(`Years in profile merge:                  ${profileYears.join(", ") || "(none)"}`)
  if (rawYears.length && profileYears.length) {
    const missing = rawYears.filter((y) => !profileYears.includes(y))
    const extra = profileYears.filter((y) => !rawYears.includes(y))
    if (missing.length) console.log(`Raw years not in profile (check name/grad window): ${missing.join(", ")}`)
    if (extra.length) console.log(`Profile years from athlete JSON / dedupe only: ${extra.join(", ")}`)
  }
  console.log("")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
