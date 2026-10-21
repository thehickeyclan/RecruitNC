#!/usr/bin/env npx tsx
/**
 * Link national ranking rows already on file to profiles in their own state (21 Oct 2026). The
 * import only ever matched North Carolina rows, so SC and VA's ranked wrestlers were never on
 * their profiles. Same matcher the import uses (name + school), against that state's profiles
 * only; a graduate is never linked. Writes only rows with no athlete_id.
 *
 *   npx tsx scripts/link-national-rankings-by-state.ts --state VA [--write]
 */
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"
import { buildAthleteIndex, matchAthlete, type MatchableAthlete } from "../lib/other-tournament-import"

for (const f of [".env.local", ".env"]) {
  const p = path.join(process.cwd(), f)
  if (!fs.existsSync(p)) continue
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
const STATE = String(process.argv[process.argv.indexOf("--state") + 1] ?? "").toUpperCase()
const WRITE = process.argv.includes("--write")

async function main() {
  const { data: rows } = await sb.from("national_rankings").select("id, athlete_name, high_school, gender, class_year, rank, source, weight_class").eq("state", STATE).is("athlete_id", null)
  const athletes: Array<MatchableAthlete & { gender: string | null }> = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await sb.from("athletes").select('id, name, wrestling_name, highschool, "wrestlingClub", graduationyear, gender').eq("state", STATE).order("id").range(f, f + 999)
    if (error) throw error
    athletes.push(...((data ?? []) as never[]))
    if (!data || data.length < 1000) break
  }
  const current = athletes.filter((a) => !a.graduationyear || Number(a.graduationyear) >= 2027)
  const byGender = (g: string) => buildAthleteIndex(current.filter((a) => !a.gender || (g === "F" ? /^f/i.test(a.gender) : !/^f/i.test(a.gender))))
  const idx = { F: byGender("F"), M: byGender("M") }
  const links: Array<{ id: string; athleteId: string; label: string }> = []
  for (const r of rows ?? []) {
    const out = matchAthlete(String(r.athlete_name), String(r.high_school ?? ""), r.gender === "F" ? idx.F : idx.M)
    const label = `${r.source} #${r.rank} ${r.weight_class ?? ""} ${r.athlete_name} (${r.high_school ?? "?"}, ${r.class_year ?? "?"})`
    if (out.status === "matched") links.push({ id: r.id, athleteId: out.athlete.id, label: `${label} -> ${out.athlete.name}` })
    else console.log(`  not linked: ${label} [${out.status}]`)
  }
  console.log(`${STATE}: ${rows?.length ?? 0} unlinked ranking rows; ${links.length} link to a profile`)
  for (const l of links) console.log(`  ${l.label}`)
  if (!WRITE) return console.log("\nDry run. --write to apply.")
  for (const l of links) {
    const { error } = await sb.from("national_rankings").update({ athlete_id: l.athleteId }).eq("id", l.id).is("athlete_id", null)
    if (error) throw error
  }
  console.log(`\nLinked ${links.length}. Undo: set athlete_id back to null on these ids: ${links.map((l) => l.id).join(",")}`)
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
