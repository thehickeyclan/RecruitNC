#!/usr/bin/env npx tsx
/**
 * Create NC profiles for state placers who do not have one, and link the ones who do.
 *
 * A placement in `wrestling_nchsaa_results` with no `athlete_id` reaches nobody: the wrestler is
 * absent from the directory and from any ranking, however she finished. 58 girls who placed top
 * three at the 2026 state tournament had no profile, including an 8A champion.
 *
 * These are ordinary unclaimed profiles, the same kind a family claims later: name, school, gender,
 * state. No contact details, no date of birth, no GPA - only what the state tournament published.
 * A name that already belongs to a profile at the same school is LINKED, never duplicated, because
 * a second profile for a wrestler who already has one is what the claim flow asks people to avoid.
 * A profile carrying no school at all is linked on the name too: there is nothing there to
 * contradict it, and three of these girls had exactly that.
 *
 * For a PRIOR season, --allow-transfer also links a sole name match whose school differs, because
 * wrestlers change schools: Moriah Antis placed at Jay M. Robinson in 2025 and Bradford Preparatory
 * in 2026, and refusing that link creates a second profile for a girl who already has one - the
 * thing the claim flow asks people to avoid. Each one is printed by name.
 *
 *   npx tsx scripts/mint-nc-state-placer-profiles.ts [--year 2026] [--max-place 3] [--gender Girls] [--write]
 */
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"
import { nameWords, schoolsLikelySame } from "@/lib/athlete-name-match"

for (const f of [".env.local", ".env"]) {
  const p = path.join(process.cwd(), f)
  if (!fs.existsSync(p)) continue
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
}
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)
const arg = (n: string, d?: string) => {
  const i = process.argv.indexOf(`--${n}`)
  return i > 0 ? String(process.argv[i + 1]) : d
}
const WRITE = process.argv.includes("--write")
const YEAR = Number(arg("year", "2026"))
const MAX_PLACE = Number(arg("max-place", "3"))
const GENDER = arg("gender", "Girls")!
/*
 * --everyone widens the run from "top N placers of one gender" to every wrestler in the
 * tournament that year, both genders, placers and qualifiers alike.
 *
 * The line is state qualifier and above: a wrestler who reached the state tournament gets a
 * profile made for him, and everybody else makes their own. 758 of North Carolina's 1,347
 * entrants in 2026 had none, among them 280 placers and 30 state champions - a champion could
 * win a title and have no page for a college coach to open (Matt, 14 Oct 2026).
 */
const EVERYONE = process.argv.includes("--everyone")
const ALLOW_TRANSFER = process.argv.includes("--allow-transfer")
const nn = (raw: unknown) => nameWords(String(raw ?? "")).join(" ")
const title = (s: string) => s.replace(/\S+/g, (w) => (/[a-z]/.test(w) && /[A-Z]/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))

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

async function main() {
  console.log(WRITE ? "WRITING\n" : "DRY RUN — nothing is written\n")
  type Placer = { id: string; athlete_id: string | null; year: number; place: number; classification: string; weight_class: string; wrestler_name: string; school: string }
  const placers = (await page<Placer>("wrestling_nchsaa_results", "id, athlete_id, year, place, classification, weight_class, wrestler_name, school"))
    .filter((r) => {
      if (r.year !== YEAR) return false
      if (EVERYONE) return true
      if (!new RegExp(GENDER, "i").test(String(r.classification))) return false
      return Number(r.place) >= 1 && Number(r.place) <= MAX_PLACE
    })
  const unlinked = placers.filter((r) => !r.athlete_id)
  console.log(
    EVERYONE
      ? `${YEAR} every entrant, both genders: ${placers.length} rows, ${unlinked.length} reaching no profile`
      : `${YEAR} ${GENDER} top ${MAX_PLACE}: ${placers.length} placements, ${unlinked.length} reaching no profile`,
  )

  const athletes = await page<{ id: string; name: string; highschool: string | null }>("athletes", "id, name, highschool")
  const idents = (await page<{ normalized_name: string; state: string | null; graduation_year: number | null }>("athlete_identities", "normalized_name, state, graduation_year"))
    .filter((i) => i.state === "NC" && Number(i.graduation_year) > 0)
  const gradOf = new Map(idents.map((i) => [i.normalized_name, Number(i.graduation_year)]))

  /* One person per name+school, so two placements for the same wrestler make one profile. */
  const toLink: Array<{ placerId: string; athleteId: string; label: string }> = []
  const toCreate = new Map<string, { row: Record<string, unknown>; label: string; placerIds: string[] }>()
  const ambiguous: string[] = []
  for (const r of unlinked) {
    const sameName = athletes.filter((a) => nn(a.name) === nn(r.wrestler_name))
    const sameSchool = sameName.filter((a) => schoolsLikelySame(a.highschool, r.school))
    /* A profile with no school recorded cannot disagree about the school. */
    const schoolless = sameName.filter((a) => !String(a.highschool ?? "").trim())
    const candidates = sameSchool.length ? sameSchool : schoolless
    if (candidates.length === 1) {
      const pick = candidates[0]!
      toLink.push({ placerId: r.id, athleteId: pick.id, label: `${r.wrestler_name} -> ${pick.name} (${pick.highschool ?? "no school on the profile"})` })
      continue
    }
    if (false) {
      toLink.push({ placerId: r.id, athleteId: sameSchool[0]!.id, label: `${r.wrestler_name} -> ${sameSchool[0]!.name} (${sameSchool[0]!.highschool})` })
      continue
    }
    if (sameName.length === 1 && ALLOW_TRANSFER) {
      const pick = sameName[0]!
      toLink.push({ placerId: r.id, athleteId: pick.id, label: `${r.wrestler_name}: ${r.school} -> ${pick.name} (${pick.highschool}) [school changed]` })
      continue
    }
    if (sameName.length) {
      ambiguous.push(`${r.wrestler_name} (${r.school}) vs ${sameName.map((a) => `${a.name} (${a.highschool ?? "no school"})`).join(" / ")}`)
      continue
    }
    const key = `${nn(r.wrestler_name)}|${nn(r.school)}`
    const held = toCreate.get(key)
    if (held) { held.placerIds.push(r.id); continue }
    const name = title(String(r.wrestler_name).trim())
    const parts = name.split(/\s+/)
    toCreate.set(key, {
      row: {
        name,
        firstName: parts[0],
        lastName: parts.slice(1).join(" "),
        highschool: r.school || null,
        // The row's own classification, not the flag: an --everyone run carries both.
        gender: /girls|women/i.test(String(r.classification)) ? "Female" : "Male",
        state: "NC",
        is_nc_athlete: true,
        graduationyear: gradOf.get(nn(r.wrestler_name)) ?? null,
      },
      label: `${name} — ${r.school}, ${r.classification} ${r.weight_class}, place ${r.place}`,
      placerIds: [r.id],
    })
  }
  console.log(`   already have a profile at that school, to LINK : ${toLink.length}`)
  console.log(`   need a profile created                         : ${toCreate.size}`)
  console.log(`   name matches a profile at a different school   : ${ambiguous.length}`)
  for (const a of ambiguous) console.log(`      ${a}`)
  const withYear = [...toCreate.values()].filter((c) => c.row.graduationyear).length
  console.log(`\n   of the new profiles, class year known: ${withYear}/${toCreate.size}`)
  for (const c of [...toCreate.values()].slice(0, 8)) console.log(`      ${c.label}`)

  if (!WRITE) { console.log("\nRe-run with --write."); return }
  let linked = 0
  for (const l of toLink) {
    const { error } = await sb.from("wrestling_nchsaa_results").update({ athlete_id: l.athleteId }).eq("id", l.placerId).is("athlete_id", null)
    if (error) { console.error(`   link failed ${l.label}: ${error.message}`); continue }
    linked++
  }
  console.log(`linked ${linked} placements to existing profiles`)

  let made = 0
  for (const c of toCreate.values()) {
    const { data, error } = await sb.from("athletes").insert(c.row).select("id").single()
    if (error || !data) { console.error(`   create failed ${c.label}: ${error?.message}`); continue }
    made++
    for (const pid of c.placerIds) {
      await sb.from("wrestling_nchsaa_results").update({ athlete_id: (data as { id: string }).id }).eq("id", pid).is("athlete_id", null)
    }
  }
  console.log(`created ${made} profiles and attached their placements`)
}
main().catch((e) => { console.error("FAILED:", e.message); process.exit(1) })
