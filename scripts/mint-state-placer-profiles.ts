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
 *   npx tsx scripts/mint-state-placer-profiles.ts --state SC [--season 2026] [--include-graduated] [--write]
 */
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"
import { nameWords, schoolsLikelySame } from "@/lib/athlete-name-match"
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
const WRITE = process.argv.includes("--write")
const INCLUDE_GRADUATED = process.argv.includes("--include-graduated")
const STATE = normalizeState(arg("state"))
const SEASON = Number(arg("season", "2026"))
const MAX_PLACE = Number(arg("max-place", "8"))
const nn = (raw: unknown) => nameWords(String(raw ?? "")).join(" ")
const title = (s: string) =>
  s.replace(/\S+/g, (w) => (/[a-z]/.test(w) && /[A-Z]/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))

async function page<T>(table: string, select: string, filt?: (q: never) => never): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    let q = sb.from(table).select(select) as never
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
    (r) => Number(r.season) === SEASON && r.place != null && Number(r.place) >= 1 && Number(r.place) <= MAX_PLACE,
  )
  const unlinked = placers.filter((r) => !r.athlete_id)
  console.log(`${STATE} ${SEASON} placers (top ${MAX_PLACE}): ${placers.length}, ${unlinked.length} reaching no profile`)

  /* One person per name+school: two placements for the same wrestler make one profile. */
  const schoolOf = (r: Placer) => String(r.school_clean ?? r.school_raw ?? "").trim()
  const groups = new Map<string, Placer[]>()
  for (const r of unlinked) {
    const k = `${nn(r.wrestler_name)}|${nn(schoolOf(r))}`
    const held = groups.get(k) ?? []
    held.push(r)
    groups.set(k, held)
  }

  const active = currentClassYears()
  const inSchool = (y: number | null) => y != null && y >= active[0]! && y <= active[active.length - 1]!

  const athletes = await page<{ id: string; name: string; highschool: string | null; state: string | null }>(
    "athletes",
    "id, name, highschool, state",
  )

  const toLink: Array<{ ids: string[]; athleteId: string; label: string }> = []
  const toCreate: Array<{ row: Record<string, unknown>; label: string; ids: string[] }> = []
  const graduated: string[] = []
  const ambiguous: string[] = []

  for (const [, rows] of groups) {
    const r = rows[0]!
    const school = schoolOf(r)
    const gradYear = r.grad_year == null ? null : Number(r.grad_year)
    if (!INCLUDE_GRADUATED && gradYear != null && !inSchool(gradYear)) {
      graduated.push(`${r.wrestler_name} (${school}) class of ${gradYear}`)
      continue
    }
    const sameName = athletes.filter((a) => nn(a.name) === nn(r.wrestler_name))
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
    const name = title(String(r.wrestler_name).trim())
    const parts = name.split(/\s+/)
    toCreate.push({
      row: {
        name,
        firstName: parts[0],
        lastName: parts.slice(1).join(" "),
        highschool: school || null,
        gender: /girl|female|women/i.test(String(r.gender ?? r.classification ?? "")) ? "Female" : "Male",
        state: STATE,
        /* The flag means North Carolina and nothing else; these are not. */
        is_nc_athlete: false,
        graduationyear: gradYear,
      },
      label: `${name} — ${school}, ${r.classification} ${r.weight}, place ${r.place}${gradYear ? `, class of ${gradYear}` : ", no class year"}`,
      ids: rows.map((x) => x.id),
    })
  }

  console.log(`   distinct wrestlers                        : ${groups.size}`)
  console.log(`   already have a profile, to LINK           : ${toLink.length}`)
  console.log(`   need a profile created                    : ${toCreate.length}`)
  console.log(`      of those, class year known             : ${toCreate.filter((c) => c.row.graduationyear).length}`)
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
