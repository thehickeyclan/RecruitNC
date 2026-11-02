#!/usr/bin/env npx tsx
/**
 * Create profiles for a state's tournament placers, and attach their placements.
 *
 * North Carolina has its own minter, because its placements live in `wrestling_nchsaa_results`
 * and its line is state qualifier and above — it is home, and we went deeper there. Everywhere
 * else the line is the podium: 280 placers in South Carolina's 2026 field against 966 entrants,
 * and at the full field the country is ~48,000 profiles and years away (Matt, 14 Oct 2026).
 *
 * The placements are in `state_tournament_placers`, 49 states of them, and reach a profile
 * through `athlete_id` — the same way NC's do, and the column this script writes. Do NOT use
 * `source_athlete_id`: that holds a FloArena id from the scrape, and `athlete_identities` carries
 * null for it, so the two cannot be joined at all.
 *
 * Who is minted, and who is not:
 *   - A placer still in school is minted. That is the whole point: this is a recruiting product.
 *   - A placer who has already graduated is NOT, by default. Minting 113 South Carolina seniors
 *     who left in June only to prune them again is churn, and a graduated profile is what
 *     scripts/prune-graduated-profiles.ts exists to remove. --include-graduated overrides it.
 *   - A placer with no class year IS minted. We may learn the year later, and a profile with a
 *     placement and no year is recoverable; a wrestler we never created is invisible.
 *
 * A name that already belongs to a profile at the same school is LINKED, never duplicated, and a
 * name matching a profile at a DIFFERENT school is left alone and printed — out of state we have
 * no school list to rule a namesake out, and 133 placer names already repeat nationally.
 *
 *   npx tsx scripts/mint-state-placer-profiles.ts --state SC [--season 2026] [--include-qualifiers] [--include-graduated] [--write]
 */
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"
import { nameReadings, nameWords, namesReferToSamePerson, schoolsLikelySame } from "@/lib/athlete-name-match"
import { currentClassYears } from "@/lib/class-years"
import { normalizeState } from "@/lib/athlete-state"

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
/*
 * An unknown flag stops the run rather than being ignored.
 *
 * Several state imports were invoked with `--link-only`, which this script has never had. It was
 * silently dropped and the run did something subtly different from what the command said - it
 * minted as well as linked. The behaviour was the right one, so nothing was damaged, but a flag
 * that does nothing and says nothing is how a real mistake gets made on the run after.
 */
const KNOWN_FLAGS = new Set(["--write", "--include-graduated", "--only-with-class-year", "--state", "--season"])
for (let i = 0; i < process.argv.length; i += 1) {
  const a = process.argv[i]!
  if (!a.startsWith("--")) continue
  if (!KNOWN_FLAGS.has(a)) throw new Error(`unknown flag ${a}. Known: ${[...KNOWN_FLAGS].join(" ")}`)
}

const WRITE = process.argv.includes("--write")
const INCLUDE_GRADUATED = process.argv.includes("--include-graduated")
/**
 * Skip placers with no class year (21 Oct 2026, VISAA 2026: 62 of 92 had none, and most of a
 * podium with no year are seniors who have left). Hold them until the year is known.
 */
/**
 * State qualifiers who did not place, too (Matt, 30 Oct 2026: SC's launch push). The state files hold
 * every entrant; a non-placer is a row with no place. Qualifiers are minted only with a current class
 * year (the profile rule: never mint without one), so this flag also turns on --only-with-class-year.
 */
const INCLUDE_QUALIFIERS = process.argv.includes("--include-qualifiers")
const ONLY_KNOWN = process.argv.includes("--only-with-class-year") || INCLUDE_QUALIFIERS
const STATE = normalizeState(arg("state"))
const SEASON = Number(arg("season", "2026"))
const MAX_PLACE = Number(arg("max-place", "8"))
const nn = (raw: unknown) => nameWords(String(raw ?? "")).join(" ")
const title = (s: string) =>
  s.replace(/\S+/g, (w) => (/[a-z]/.test(w) && /[A-Z]/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))

async function page<T>(table: string, select: string, filt?: (q: never) => never): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    // A fixed order, or pages overlap and rows go missing (VA 2026: 504 boys and 72 girls read as 473 boys).
    let q = (sb.from(table).select(select) as unknown as { order: (c: string) => never }).order("id")
    if (filt) q = filt(q)
    const { data, error } = await (q as { range: (a: number, b: number) => Promise<{ data: unknown[] | null; error: { message: string } | null }> }).range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...((data ?? []) as T[]))
    if (!data || data.length < 1000) break
  }
  return out
}

type Placer = {
  id: string
  season: number
  classification: string | null
  gender: string | null
  weight: string | null
  place: number | null
  wrestler_name: string
  school_clean: string | null
  school_raw: string | null
  grad_year: number | null
  athlete_id: string | null
}

async function main() {
  if (!arg("state")) throw new Error("--state is required, e.g. --state SC")
  console.log(WRITE ? `WRITING — ${STATE} ${SEASON}\n` : `DRY RUN — ${STATE} ${SEASON}, nothing is written\n`)

  const all = await page<Placer>(
    "state_tournament_placers",
    "id, season, classification, gender, weight, place, wrestler_name, school_clean, school_raw, grad_year, athlete_id",
    ((q: { eq: (c: string, v: string) => never }) => q.eq("state", STATE)) as never,
  )
  const placers = all.filter(
    (r) =>
      Number(r.season) === SEASON &&
      ((r.place != null && Number(r.place) >= 1 && Number(r.place) <= MAX_PLACE) || (INCLUDE_QUALIFIERS && (r.place == null || Number(r.place) < 1))),
  )
  const unlinked = placers.filter((r) => !r.athlete_id)
  console.log(`${STATE} ${SEASON} ${INCLUDE_QUALIFIERS ? "entrants (placers and qualifiers)" : `placers (top ${MAX_PLACE})`}: ${placers.length}, ${unlinked.length} reaching no profile`)

  /*
   * One person per name+school: two placements for the same wrestler make one profile.
   *
   * Grouped by name first and then clustered with `schoolsLikelySame`, not by a normalised school
   * string. A string key splits on spellings that the matcher itself treats as one school:
   * Maryland's MIS file writes "Loyola Blakefield" and its MIAA file "Loyola-Blakefield", and
   * five boys who entered both tournaments were each created twice in a single run - the one
   * thing the claim flow asks people to avoid, done by us.
   */
  const schoolOf = (r: Placer) => String(r.school_clean ?? r.school_raw ?? "").trim()
  const byName = new Map<string, Placer[]>()
  for (const r of unlinked) {
    const k = nn(r.wrestler_name)
    byName.set(k, [...(byName.get(k) ?? []), r])
  }
  /*
   * One wrestler, two names, because a bracket quoted his nickname: Florida printed
   * `Steven \`Jett\` Johnson` in 2025 and `Jett Johnson` in 2026 — the same Cocoa Beach
   * 106-pounder, who came out of this loop as two profiles. Names that refer to one person
   * (nameReadings) at a school that agrees are folded together before clustering.
   */
  for (const [a, rowsA] of [...byName]) {
    if (!byName.has(a)) continue
    for (const [b, rowsB] of [...byName]) {
      if (b === a || !byName.has(b) || !byName.has(a)) continue
      if (!namesReferToSamePerson(rowsA[0]!.wrestler_name, rowsB[0]!.wrestler_name)) continue
      if (!schoolsLikelySame(schoolOf(rowsA[0]!), schoolOf(rowsB[0]!))) continue
      byName.set(a, [...byName.get(a)!, ...rowsB])
      byName.delete(b)
    }
  }
  const groups = new Map<string, Placer[]>()
  for (const [name, rows] of byName) {
    const clusters: Placer[][] = []
    for (const r of rows) {
      const fit = clusters.find((c) => schoolsLikelySame(schoolOf(c[0]!), schoolOf(r)))
      if (fit) fit.push(r)
      else clusters.push([r])
    }
    clusters.forEach((c, i) => groups.set(`${name}|${nn(schoolOf(c[0]!))}|${i}`, c))
  }

  const active = currentClassYears()
  const inSchool = (y: number | null) => y != null && y >= active[0]! && y <= active[active.length - 1]!

  /*
   * Only this state's profiles can be the wrestler in front of us.
   *
   * The candidate list was every profile in the country, so a namesake in another state blocked
   * minting: Noah Tucker of Bullis School, Maryland - three MIS seasons, 2026 champion at 175 -
   * went unminted because Noah Tucker of Union County, South Carolina already existed, a
   * different boy at a different weight in a different state. Profiles carry a state now, so
   * that is answerable. A profile with no state is still considered, since it cannot disagree.
   */
  const athletes = (await page<{ id: string; name: string; highschool: string | null; state: string | null; graduationyear: number | null }>(
    "athletes",
    "id, name, highschool, state, graduationyear",
  )).filter((a) => {
    const s = String(a.state ?? "").trim().toUpperCase()
    return !s || s === STATE
  })

  const toLink: Array<{ ids: string[]; athleteId: string; label: string }> = []
  const toCreate: Array<{ row: Record<string, unknown>; label: string; ids: string[] }> = []
  const graduated: string[] = []
  const heldNoYear: string[] = []
  const ambiguous: string[] = []

  for (const [, rows] of groups) {
    const r = rows[0]!
    const school = schoolOf(r)
    const gradYear = r.grad_year == null ? null : Number(r.grad_year)
    if (!INCLUDE_GRADUATED && gradYear != null && !inSchool(gradYear)) {
      graduated.push(`${r.wrestler_name} (${school}) class of ${gradYear}`)
      continue
    }
    if (ONLY_KNOWN && gradYear == null) {
      heldNoYear.push(`${r.wrestler_name} (${school})`)
      continue
    }
    /*
     * A profile whose class year contradicts this placer's is a different wrestler, not an
     * ambiguity to hold. Maryland has two Logan Browns: Northwest's, class of 2027, a 2026
     * champion at 165, and McDonogh's, class of 2028, a heavyweight. The first went unminted
     * because the second existed and shared his name. Where either year is unknown the name
     * still holds, which is the cautious half of the rule.
     */
    const placerYear = rows.map((x) => Number(x.grad_year)).find((y) => y > 0) ?? null
    const sameName = athletes.filter((a) => {
      if (!namesReferToSamePerson(a.name, r.wrestler_name)) return false
      const theirs = Number((a as { graduationyear?: unknown }).graduationyear)
      return !(placerYear && theirs > 0 && theirs !== placerYear)
    })
    const sameSchool = sameName.filter((a) => schoolsLikelySame(a.highschool, school))
    if (sameSchool.length === 1) {
      toLink.push({ ids: rows.map((x) => x.id), athleteId: sameSchool[0]!.id, label: `${r.wrestler_name} -> ${sameSchool[0]!.name} (${sameSchool[0]!.highschool ?? "no school"})` })
      continue
    }
    /*
     * A profile carrying no school cannot contradict one — but only inside the same state.
     *
     * Reagan Beard is an existing South Carolina profile with no school on file, and the Rock
     * Hill placer is her; creating a second is what the claim flow asks people to avoid. Jenger
     * Rhodes is the same shape and marked NORTH Carolina, and that is a different claim about a
     * different person until something says otherwise. Out of state we have no school list to
     * rule a namesake out, and 133 placer names already repeat nationally.
     */
    const schoolless = sameName.filter(
      (a) => !String(a.highschool ?? "").trim() && String(a.state ?? "").toUpperCase() === STATE,
    )
    if (schoolless.length === 1) {
      toLink.push({ ids: rows.map((x) => x.id), athleteId: schoolless[0]!.id, label: `${r.wrestler_name} -> ${schoolless[0]!.name} (no school on the profile, ${STATE})` })
      continue
    }
    if (sameName.length) {
      ambiguous.push(`${r.wrestler_name} (${school}) vs ${sameName.map((a) => `${a.name} (${a.highschool ?? "no school"}, ${a.state ?? "no state"})`).join(" / ")}`)
      continue
    }
    /*
     * The formal reading is the profile's name and the nickname is its wrestling name, which is
     * where the rest of the product already looks for the other spelling a bracket might print
     * (lib/public-profile-data.ts). `Steven \`Jett\` Johnson` becomes Steven Johnson, wrestling
     * as Jett Johnson — not a profile whose name carries a stray pair of backticks.
     */
    const readings = nameReadings(String(r.wrestler_name).trim())
    const name = title(readings[0] ?? String(r.wrestler_name).trim())
    const wrestlingName = readings[1] ? title(readings[1]) : null
    const parts = name.split(/\s+/)
    toCreate.push({
      row: {
        name,
        wrestling_name: wrestlingName,
        firstName: parts[0],
        lastName: parts.slice(1).join(" "),
        highschool: school || null,
        gender: /girl|female|women/i.test(String(r.gender ?? r.classification ?? "")) ? "Female" : "Male",
        state: STATE,
        /* The flag means North Carolina and nothing else; these are not. */
        is_nc_athlete: false,
        graduationyear: gradYear,
      },
      label: `${name} — ${school}, ${r.classification} ${r.weight}, ${r.place ? `place ${r.place}` : "qualifier"}${gradYear ? `, class of ${gradYear}` : ", no class year"}`,
      ids: rows.map((x) => x.id),
    })
  }

  console.log(`   distinct wrestlers                        : ${groups.size}`)
  console.log(`   already have a profile, to LINK           : ${toLink.length}`)
  console.log(`   need a profile created                    : ${toCreate.length}`)
  console.log(`      of those, class year known             : ${toCreate.filter((c) => c.row.graduationyear).length}`)
  if (ONLY_KNOWN) console.log(`   no class year, held (--only-with-class-year): ${heldNoYear.length}`)
  console.log(`   graduated, skipped${INCLUDE_GRADUATED ? " (OVERRIDDEN)" : "                      "}: ${graduated.length}`)
  console.log(`   name matches a profile elsewhere, skipped : ${ambiguous.length}`)
  for (const a of ambiguous) console.log(`      ${a}`)
  for (const c of toCreate.slice(0, 8)) console.log(`      ${c.label}`)

  if (!WRITE) {
    console.log("\nRe-run with --write.")
    return
  }

  let linked = 0
  for (const l of toLink) {
    for (const id of l.ids) {
      const { error } = await sb.from("state_tournament_placers").update({ athlete_id: l.athleteId }).eq("id", id).is("athlete_id", null)
      if (error) console.error(`   link failed ${l.label}: ${error.message}`)
      else linked++
    }
  }
  console.log(`\nlinked ${linked} placements to existing profiles`)

  let made = 0
  let attached = 0
  for (const c of toCreate) {
    const { data, error } = await sb.from("athletes").insert(c.row).select("id").single()
    if (error || !data) {
      console.error(`   create failed ${c.label}: ${error?.message}`)
      continue
    }
    made++
    for (const id of c.ids) {
      const { error: e2 } = await sb.from("state_tournament_placers").update({ athlete_id: (data as { id: string }).id }).eq("id", id).is("athlete_id", null)
      if (!e2) attached++
    }
  }
  console.log(`created ${made} profiles and attached ${attached} placements`)
}
main().catch((e) => {
  console.error("FAILED:", e.message)
  process.exit(1)
})
