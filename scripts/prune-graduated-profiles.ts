#!/usr/bin/env npx tsx
/**
 * Remove profiles for wrestlers who have left high school.
 *
 * RecruitNC is a recruiting product: a profile is a recruitable person, and a wrestler who
 * graduated is not one. They were minted because last season's field always contains a graduating
 * class and nothing says which until class years are resolved.
 *
 * Nothing is lost by removing them. Opponent accolades - "beat the 2026 4A state champion" on a
 * current wrestler's profile - are built from the result tables, never from `athletes`:
 * significant-wins.ts and opponent-accolades.ts do not read that table at all. 28 of the 35 I-64
 * credentials came from Virginia, South Carolina and Georgia wrestlers who have no profile here.
 * So the placements stay, the credit stays, and only the recruiting row goes.
 *
 * Three profiles are never removed: one somebody claimed, because it belongs to a family; one
 * carrying a college, because that is the record of where they went; and one a college coach has
 * starred, because a star is a coach saying he is watching this wrestler. The star rule was not
 * written here first - the foreign key on college_coach_stars refused 35 deletes and taught it
 * (14 Oct 2026). A constraint catching a product rule is luck, so the rule lives here now.
 *
 *   npx tsx scripts/prune-graduated-profiles.ts            dry run, writes the export
 *   npx tsx scripts/prune-graduated-profiles.ts --write    deletes, after exporting
 */
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"
import { mostRecentGraduatedClassYear } from "@/lib/class-years"

for (const f of [".env.local", ".env"]) {
  const p = path.join(process.cwd(), f)
  if (!fs.existsSync(p)) continue
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
}
const WRITE = process.argv.includes("--write")
/** Every table that points at a profile, so the export can carry the whole picture. */
const LINKED: Array<[string, string]> = [
  ["wrestling_nchsaa_results", "athlete_id"],
  ["other_tournament_results", "athlete_id"],
  ["other_tournament_bouts", "athlete_id"],
  ["nhsca_placements", "athlete_id"],
  ["super32_results", "athlete_id"],
  ["fargo_results", "athlete_id"],
  ["matches", "wrestler_id"],
  ["result_athlete_links", "athlete_id"],
]

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const cutoff = mostRecentGraduatedClassYear()
  console.log(`classes of ${cutoff} and earlier have left high school\n`)

  const ath: any[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from("athletes").select("*").range(from, from + 999)
    if (error) throw new Error(error.message)
    ath.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  const graduated = ath.filter((a) => a.graduationyear && Number(a.graduationyear) <= cutoff)
  const claimed = graduated.filter((a) => a.claimed_at || a.claimed_by_user_id)
  const committed = graduated.filter((a) => String(a.college ?? "").trim())
  const starRows: any[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from("college_coach_stars").select("athlete_id").range(from, from + 999)
    if (error) { console.log(`   (college_coach_stars: ${error.message})`); break }
    starRows.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  const starredIds = new Set(starRows.map((r) => String(r.athlete_id)))
  const starred = graduated.filter((a) => starredIds.has(String(a.id)))
  const keepIds = new Set([...claimed, ...committed, ...starred].map((a) => String(a.id)))
  const toRemove = graduated.filter((a) => !keepIds.has(String(a.id)))
  console.log(`profiles: ${ath.length}`)
  console.log(`   graduated (${cutoff} or earlier): ${graduated.length}`)
  console.log(`   kept — claimed by a family:       ${claimed.length}`)
  console.log(`   kept — carries a commitment:      ${committed.length}`)
  console.log(`   kept — starred by a college coach:${String(starred.length).padStart(3)}`)
  console.log(`   TO REMOVE:                        ${toRemove.length}\n`)

  const ids = new Set(toRemove.map((a) => String(a.id)))
  const linkedRows: Record<string, any[]> = {}
  for (const [table, col] of LINKED) {
    const rows: any[] = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await sb.from(table).select("*").range(from, from + 999)
      if (error) { console.log(`   (${table}: ${error.message})`); break }
      rows.push(...(data ?? []).filter((r: any) => ids.has(String(r[col]))))
      if (!data || data.length < 1000) break
    }
    linkedRows[table] = rows
    console.log(`   ${table.padEnd(28)} ${rows.length} rows point at a profile being removed`)
  }
  /*
   * The export is the safety net, so it is written once and never written over.
   *
   * A dry run an hour after the real one rewrote that day's file - same name, same date - and
   * replaced the record of 445 deleted profiles with a six-row file. A backup a later run can
   * clobber is not a backup, so the name carries the time and an existing file is refused.
   */
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
  const file = `ranking-snapshots/graduated-profiles-export-${stamp}.json`
  if (fs.existsSync(file)) throw new Error(`${file} already exists; refusing to overwrite an export`)
  fs.writeFileSync(file, JSON.stringify({ cutoff, profiles: toRemove, linked: linkedRows }, null, 2))
  const size = (fs.statSync(file).size / 1024 / 1024).toFixed(1)
  const readback = JSON.parse(fs.readFileSync(file, "utf8"))
  console.log(`\nexported ${readback.profiles.length} profiles + linked rows -> ${file} (${size} MB, re-read OK)`)

  if (!WRITE) { console.log("\nDRY RUN — nothing deleted. Re-run with --write."); return }
  /* Clear the pointer first: a result row must survive its wrestler's profile, because the placer
     index reads those rows to credit opponents. */
  for (const [table, col] of LINKED) {
    let touched = 0
    for (const r of linkedRows[table] ?? []) {
      /*
       * A result row outlives the profile - the placer index reads it to credit opponents - so its
       * pointer is cleared and the row stays. A row in result_athlete_links is nothing but the
       * pointer, so it goes.
       */
      const { error } = table === "result_athlete_links"
        ? await sb.from(table).delete().eq("id", r.id)
        : await sb.from(table).update({ [col]: null }).eq("id", r.id)
      if (!error) touched++
    }
    if (touched) console.log(`   ${table === "result_athlete_links" ? "deleted" : "unlinked"} ${touched} rows in ${table}`)
  }
  let gone = 0
  for (const a of toRemove) {
    const { error } = await sb.from("athletes").delete().eq("id", a.id)
    if (!error) gone++
    else console.log(`   FAILED ${a.name}: ${error.message}`)
  }
  console.log(`\nremoved ${gone} of ${toRemove.length} profiles`)
}
main().catch((e) => { console.error("failed:", e.message); process.exit(1) })
