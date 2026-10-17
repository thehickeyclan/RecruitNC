#!/usr/bin/env npx tsx
/**
 * Attach existing result rows to the profiles that now exist for them.
 *
 * 756 profiles were minted for the 2026 North Carolina state tournament, and their NCHSAA
 * placements were attached as they were created. Everything else a wrestler did - NHSCA, Super 32,
 * Fargo, the Tournament of Champions, every bout - was imported before the profile existed and so
 * reaches nobody.
 *
 * A name alone is never enough. "Jackson Wells" is a three-time Kentucky state champion and a
 * Benedictine freshman, and a week of this project went into telling them apart. So a row is only
 * attached when the name matches exactly one profile AND the row's own school or state agrees
 * with that profile: an NC state on the row, a school that folds to the same name, or - for bouts,
 * which print clubs rather than schools - a club that matches the profile's club. Anything that
 * cannot clear that bar is left unlinked and counted.
 *
 *   npx tsx scripts/link-nc-results-to-profiles.ts [--write]
 */
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"
import { schoolsLikelySame } from "@/lib/athlete-name-match"

for (const f of [".env.local", ".env"]) {
  const p = path.join(process.cwd(), f)
  if (!fs.existsSync(p)) continue
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
}
const WRITE = process.argv.includes("--write")
const key = (s: unknown) => {
  const t = String(s ?? "").toLowerCase().replace(/[^a-z ]/g, " ").split(/\s+/).filter((w) => w.length > 1)
  return t.length < 2 ? "" : `${t[0]} ${t[t.length - 1]}`
}
type Source = { table: string; nameCol: string; schoolCols: string[]; stateCol?: string; eventCol?: string }
const SOURCES: Source[] = [
  { table: "other_tournament_results", nameCol: "athlete_name", schoolCols: ["high_school", "club"], stateCol: "state" },
  { table: "nhsca_placements", nameCol: "athlete_name", schoolCols: ["high_school"], stateCol: "state" },
  { table: "super32_results", nameCol: "athlete_name", schoolCols: ["high_school", "school"], stateCol: "state" },
  { table: "fargo_results", nameCol: "athlete_name", schoolCols: ["high_school", "club"], stateCol: "state" },
  { table: "other_tournament_bouts", nameCol: "athlete_name", schoolCols: ["athlete_club"], eventCol: "event_key" },
]

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  async function page<T>(table: string, select: string): Promise<T[]> {
    const out: T[] = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await sb.from(table).select(select).range(from, from + 999)
      if (error) throw new Error(`${table}: ${error.message}`)
      out.push(...((data ?? []) as T[]))
      if (!data || data.length < 1000) break
    }
    return out
  }
  const ath = await page<any>("athletes", "id, name, highschool, wrestlingClub, is_nc_athlete")
  const byName = new Map<string, any[]>()
  for (const a of ath) { const k = key(a.name); if (!k) continue; const v = byName.get(k) ?? []; v.push(a); byName.set(k, v) }

  /*
   * A bout prints a club, never a school or a state, so the usual corroboration cannot reach it.
   * The event itself supplies one: when a wrestler already has a result row for that event key
   * linked to a profile, his bouts at that event are his. The result row was corroborated on its
   * own school or state, so the bout inherits that evidence rather than a bare name.
   */
  const resultRows = await page<any>("other_tournament_results", "event_key, athlete_name, athlete_id")
  const linkedAtEvent = new Map<string, string>()
  for (const r of resultRows) {
    if (!r.athlete_id) continue
    linkedAtEvent.set(`${r.event_key}|${key(r.athlete_name)}`, String(r.athlete_id))
  }
  console.log(`result rows already linked, usable as bout evidence: ${linkedAtEvent.size}\n`)

  console.log(WRITE ? "WRITING\n" : "DRY RUN\n")
  let grand = 0
  for (const src of SOURCES) {
    const cols = ["id", src.nameCol, "athlete_id", ...src.schoolCols, ...(src.stateCol ? [src.stateCol] : []), ...(src.eventCol ? [src.eventCol] : [])].join(", ")
    const rows = await page<any>(src.table, cols)
    const plan: Array<{ id: string; athleteId: string }> = []
    let soleName = 0, noCorroboration = 0
    for (const r of rows) {
      if (r.athlete_id) continue
      const hits = byName.get(key(r[src.nameCol])) ?? []
      if (hits.length !== 1) continue
      soleName++
      const a = hits[0]!
      const stateOk = src.stateCol ? /^nc$|north carolina/i.test(String(r[src.stateCol] ?? "")) : false
      const schoolOk = src.schoolCols.some((c) =>
        schoolsLikelySame(a.highschool, r[c]) || schoolsLikelySame(a.wrestlingClub, r[c]))
      const eventOk = src.eventCol
        ? linkedAtEvent.get(`${r[src.eventCol]}|${key(r[src.nameCol])}`) === String(a.id)
        : false
      if (!stateOk && !schoolOk && !eventOk) { noCorroboration++; continue }
      plan.push({ id: String(r.id), athleteId: String(a.id) })
    }
    console.log(`${src.table.padEnd(28)} sole-name matches ${String(soleName).padStart(5)} | corroborated ${String(plan.length).padStart(5)} | refused for no school/state agreement ${noCorroboration}`)
    grand += plan.length
    if (WRITE && plan.length) {
      let ok = 0
      for (const p of plan) {
        const { error } = await sb.from(src.table).update({ athlete_id: p.athleteId }).eq("id", p.id)
        if (!error) ok++
      }
      console.log(`   wrote ${ok}`)
    }
  }
  console.log(`\ntotal rows to attach: ${grand}`)
  if (!WRITE) console.log("Re-run with --write.")
}
main().catch((e) => { console.error("failed:", e.message); process.exit(1) })
