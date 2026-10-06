#!/usr/bin/env npx tsx
/**
 * Create profiles for another state's wrestlers, so their results can be linked to a person.
 *
 * Everything imported this week - 123k bouts, 53 states, 16,551 placers - is rows with names on
 * them. `decideLink` joins a result to a profile, so with no profile there is nothing to join to:
 * the placer backfill linked 11 rows of 16,551 and queued 30 cross-state namesakes. Minting is the
 * step that makes the rest of it addressable.
 *
 * One state at a time, starting with the one we have checked: South Carolina carries a class year
 * on 265 of 280 and a RankWrestlers id on 230, which is a stronger identity than anything we hold
 * for North Carolina.
 *
 * These profiles are records, not recruits:
 *   - `is_nc_athlete: false` keeps them out of the NC directory, the rankings and the claim flow
 *   - no contact details, no GPA, no date of birth - nothing we were not already storing
 *   - `source_athlete_id` carries the RankWrestlers id, so a second run finds the same person
 *
 *   npx tsx scripts/mint-out-of-state-placers.ts --state SC           # dry run
 *   npx tsx scripts/mint-out-of-state-placers.ts --state SC --write
 */
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"
import { namesLikelySamePerson } from "@/lib/athlete-name-match"

for (const f of [".env.local", ".env"]) {
  const p = path.join(process.cwd(), f)
  if (!fs.existsSync(p)) continue
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
const WRITE = process.argv.includes("--write")
const STATE = (process.argv[process.argv.indexOf("--state") + 1] ?? "").toUpperCase()
if (!STATE || STATE.length !== 2) { console.error("--state XX is required"); process.exit(1) }

const norm = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim()
const title = (name: string) =>
  /[A-Z]/.test(name) ? name : name.replace(/(^|[\s('-])([a-z])/g, (_m, pre, ch) => pre + ch.toUpperCase())

const page = async (table: string, sel: string, apply: (q: any) => any = (q) => q) => {
  const out: any[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await apply(sb.from(table).select(sel)).order("id").range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return out
}

async function main() {
  console.log(WRITE ? `WRITING — ${STATE}\n` : `DRY RUN — ${STATE}, nothing is written\n`)

  const placers = await page(
    "state_tournament_placers",
    "id,wrestler_name,school_raw,school_clean,gender,grad_year,source_athlete_id,source_athlete_id_source,place,classification,weight,season",
    (q) => q.eq("state", STATE),
  )
  // One profile per person, not per placement.
  const people = new Map<string, any>()
  for (const p of placers) {
    const k = p.source_athlete_id ? `rw:${p.source_athlete_id}` : `${norm(p.wrestler_name)}|${norm(p.school_clean || p.school_raw)}`
    const prev = people.get(k)
    // Keep the best-evidenced row: one carrying a class year beats one without.
    if (!prev || (!prev.grad_year && p.grad_year)) people.set(k, p)
  }
  console.log(`${placers.length} placement rows -> ${people.size} distinct wrestlers`)

  /*
   * `athletes` may not carry an external id yet. It is the anchor that makes a second run find the
   * same person instead of making her twice, so the script says plainly when it is missing rather
   * than quietly matching on names.
   */
  const probe = await sb.from("athletes").select("source_athlete_id").limit(1)
  const HAS_SOURCE_ID = !probe.error
  if (!HAS_SOURCE_ID) {
    console.log("NOTE: athletes.source_athlete_id does not exist - RankWrestlers ids cannot be stored,")
    console.log("      so a re-run would match on name and school alone. Add the column first.\n")
  }
  const existing = await page(
    "athletes",
    `id,name,gender,graduationyear,highschool,state,is_nc_athlete${HAS_SOURCE_ID ? ",source_athlete_id" : ""}`,
  )
  const byRwId = new Map<string, any>()
  for (const a of existing) if (a.source_athlete_id) byRwId.set(String(a.source_athlete_id), a)
  const byName = new Map<string, any[]>()
  for (const a of existing) byName.set(norm(a.name), [...(byName.get(norm(a.name)) ?? []), a])

  const toCreate: any[] = []
  const alreadyHeld: string[] = []
  const collisions: string[] = []

  for (const p of people.values()) {
    const label = `${p.wrestler_name} (${p.school_clean || p.school_raw})`
    if (p.source_athlete_id && byRwId.has(String(p.source_athlete_id))) { alreadyHeld.push(`${label} — by RankWrestlers id`); continue }
    const sameName = (byName.get(norm(p.wrestler_name)) ?? []).filter((a) => namesLikelySamePerson(a.name, p.wrestler_name))
    if (sameName.length) {
      /*
       * A name we already hold. North Carolina is not in this table, so an NC profile of the same
       * name is a different wrestler - our Hayden Smith is not Arizona's. Flagged, never merged.
       */
      const nc = sameName.filter((a) => a.is_nc_athlete !== false)
      collisions.push(`${label} vs ${sameName.map((a) => `${a.name}${a.is_nc_athlete === false ? "" : " [NC]"}`).join(", ")}${nc.length ? "  <- NC profile, do not merge" : ""}`)
      continue
    }
    toCreate.push({
      name: title(p.wrestler_name),
      firstName: title(p.wrestler_name).split(" ")[0],
      lastName: title(p.wrestler_name).split(" ").slice(1).join(" "),
      gender: p.gender === "Girls" ? "Female" : "Male",
      highschool: p.school_clean || p.school_raw || null,
      state: STATE,
      graduationyear: p.grad_year ?? null,
      is_nc_athlete: false,
      ...(HAS_SOURCE_ID
        ? { source_athlete_id: p.source_athlete_id ?? null, source_athlete_id_source: p.source_athlete_id_source ?? null }
        : {}),
    })
  }

  const withYear = toCreate.filter((a) => a.graduationyear).length
  const withRw = [...people.values()].filter((p) => p.source_athlete_id).length
  console.log(`\nwould create          : ${toCreate.length}`)
  console.log(`  carrying a class year: ${withYear}`)
  console.log(`  carrying a RW id     : ${withRw}`)
  console.log(`  female / male        : ${toCreate.filter((a) => a.gender === "Female").length} / ${toCreate.filter((a) => a.gender === "Male").length}`)
  console.log(`already held            : ${alreadyHeld.length}`)
  console.log(`name collisions, skipped: ${collisions.length}`)
  if (collisions.length) console.log(`   ${collisions.join("\n   ")}`)
  console.log(`\nsample:`)
  for (const a of toCreate.slice(0, 6)) console.log(`   ${a.name} — ${a.highschool}, ${STATE}, ${a.gender}, class of ${a.graduationyear ?? "?"}`)

  if (!WRITE) { console.log(`\nRe-run with --write to create ${toCreate.length} profiles.`); return }

  let made = 0
  for (let i = 0; i < toCreate.length; i += 100) {
    const { data, error } = await sb.from("athletes").insert(toCreate.slice(i, i + 100)).select("id")
    if (error) { console.error(`  failed: ${error.message}`); break }
    made += data?.length ?? 0
  }
  console.log(`\ncreated ${made} profiles`)
}
main()
