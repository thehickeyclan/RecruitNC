#!/usr/bin/env npx tsx
/**
 * Put our own 916 recruiting profiles into the identity registry.
 *
 * The registry seeded from state placers contains no North Carolina wrestler, because
 * state_tournament_placers excludes NC by design — so none of our profiles had an identity. The
 * obvious fix was to seed NC from wrestling_nchsaa_results, and it is the wrong one: that table
 * spans 1988 to 2026, so grouping by name there merges every wrestler who shared one across 39
 * seasons, and splitting them again needs a class year we would have to invent.
 *
 * The profiles themselves are the better source. They are curated, they carry a real gender on
 * all 916 and a real class year on 799, and they are the rows a recruiter actually reads.
 *
 * A profile is matched to an existing identity on (name, state, gender) IGNORING class year, then
 * the year is filled in from the profile. Matching on the year would split one person in two: the
 * registry has no year for 98% of placers, and COALESCE(graduation_year, 0) makes a known year and
 * an unknown one two different keys.
 *
 *   npx tsx scripts/link-profiles-to-identities.ts            # dry run
 *   npx tsx scripts/link-profiles-to-identities.ts --write
 */
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"
import { nameWords, namesLikelySamePerson } from "@/lib/athlete-name-match"

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
const WRITE = process.argv.includes("--write")
const MATCHER = "profile-identity-v1"
const nn = (raw: unknown) => nameWords(String(raw ?? "")).join(" ")

const STATE_NAMES: Record<string, string> = {
  AL: "alabama", AK: "alaska", AZ: "arizona", AR: "arkansas", CA: "california", CO: "colorado",
  CT: "connecticut", DE: "delaware", FL: "florida", GA: "georgia", HI: "hawaii", ID: "idaho",
  IL: "illinois", IN: "indiana", IA: "iowa", KS: "kansas", KY: "kentucky", LA: "louisiana",
  ME: "maine", MD: "maryland", MA: "massachusetts", MI: "michigan", MN: "minnesota",
  MS: "mississippi", MO: "missouri", MT: "montana", NE: "nebraska", NV: "nevada",
  NH: "new hampshire", NJ: "new jersey", NM: "new mexico", NY: "new york",
  NC: "north carolina", ND: "north dakota", OH: "ohio", OK: "oklahoma", OR: "oregon",
  PA: "pennsylvania", RI: "rhode island", SC: "south carolina", SD: "south dakota",
  TN: "tennessee", TX: "texas", UT: "utah", VT: "vermont", VA: "virginia", WA: "washington",
  WV: "west virginia", WI: "wisconsin", WY: "wyoming",
}

/**
 * Does the profile's school agree with the state the registry says the wrestler is from?
 *
 * A nationwide name match is only as good as its corroboration: one wrestler in the country with
 * that name and gender is good evidence, but a common name could land on a stranger. The profiles
 * name a school, and the school either says the state outright ("AL", "Alabama Highschool") or
 * matches the school the placer rows recorded ("Hoover").
 */
function schoolCorroborates(highschool: unknown, state: string, identitySchool: unknown): string | null {
  const hs = String(highschool ?? "").trim().toLowerCase()
  if (!hs) return null
  /* "AL", and also "GA Highschool" — the state code as the leading word. */
  if (hs === state.toLowerCase() || hs.split(/\W+/)[0] === state.toLowerCase()) {
    return `school field leads with the state code "${state}"`
  }
  const full = STATE_NAMES[state]
  if (full && hs.includes(full)) return `school field names ${full}`
  const theirs = String(identitySchool ?? "").trim().toLowerCase()
  if (theirs) {
    const mine = new Set(hs.split(/\W+/).filter((w) => w.length > 3))
    const hit = theirs.split(/\W+/).find((w) => w.length > 3 && mine.has(w))
    if (hit) return `school agrees with the placer record ("${hit}")`
  }
  return null
}

async function page<T>(table: string, select: string, f: (q: any) => any = (q) => q): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await f(sb.from(table).select(select)).range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...((data ?? []) as T[]))
    if (!data || data.length < 1000) break
  }
  return out
}

type Athlete = {
  id: string
  name: string | null
  wrestling_name: string | null
  gender: string | null
  graduationyear: number | null
  state: string | null
  is_nc_athlete: boolean | null
  highschool: string | null
}
type Identity = {
  id: string
  primary_school?: string | null
  normalized_name: string | null
  state: string | null
  gender: string | null
  graduation_year: number | null
  athlete_id: string | null
  last_name: string | null
  evidence: Record<string, unknown> | null
}

async function main() {
  console.log(WRITE ? "WRITING\n" : "DRY RUN — nothing is written\n")

  const athletes = await page<Athlete>("athletes", "id, name, wrestling_name, gender, graduationyear, state, is_nc_athlete, highschool")
  const identities = (await page<Identity>(
    "athlete_identities",
    "id, normalized_name, state, gender, graduation_year, athlete_id, last_name, evidence, primary_school",
  )).filter((i) => i.normalized_name)

  /* Keyed WITHOUT the class year — see the note at the top. */
  const byPerson = new Map<string, Identity[]>()
  const bySurname = new Map<string, Identity[]>()
  /*
   * Nationwide, by name and gender only — for the profiles that carry no state.
   *
   * athletes.state is null on 915 of 916 rows: NC-ness is held in is_nc_athlete, and the 24
   * out-of-state profiles name a school instead ("Catawba Ridge", or literally "AL"). Inferring a
   * state from a school name is guessing. Asking the registry which one wrestler in the country
   * has that name and gender is evidence, and it returns the state as a by-product.
   */
  const byNameGender = new Map<string, Identity[]>()
  for (const i of identities) {
    if (i.evidence?.name_incomplete) continue
    const k = `${i.normalized_name}|${i.state}|${i.gender}`
    if (!byPerson.has(k)) byPerson.set(k, [])
    byPerson.get(k)!.push(i)
    const sk = `${i.last_name}|${i.state}|${i.gender}`
    if (!bySurname.has(sk)) bySurname.set(sk, [])
    bySurname.get(sk)!.push(i)
    const ng = `${i.normalized_name}|${i.gender}`
    if (!byNameGender.has(ng)) byNameGender.set(ng, [])
    byNameGender.get(ng)!.push(i)
  }

  const attach: Array<{ identity: Identity; athlete: Athlete; method: string }> = []
  const stateless: Array<{ identity: Identity; athlete: Athlete; why: string | null }> = []
  const create: Athlete[] = []
  const review: Array<{ athlete: Athlete; candidates: Identity[] }> = []
  let unusable = 0
  let alreadyLinked = 0

  for (const a of athletes) {
    const name = nn(a.name)
    const state = (a.state ?? "").trim().toUpperCase() || (a.is_nc_athlete ? "NC" : "")
    const gender = a.gender === "Female" || a.gender === "Male" ? a.gender : null
    if (!name || !gender) { unusable++; continue }
    if (!/^[A-Z]{2}$/.test(state)) {
      /* No state on the profile: ask the country. Exactly one wrestler, or it goes to review. */
      const nationwide = byNameGender.get(`${name}|${gender}`) ?? []
      if (nationwide.length === 1) {
        const only = nationwide[0]
        /*
         * Already this profile's own identity. Re-running used to send these to review: the
         * identity was created by an earlier run with no state (nobody of that name has placed
         * anywhere), so corroborating a school against a null state could never succeed and seven
         * profiles looked ambiguous against themselves. An identity already carrying this
         * athlete_id needs no corroboration — it IS the answer.
         */
        if (only.athlete_id === a.id) { alreadyLinked++; continue }
        const why = schoolCorroborates(a.highschool, String(only.state), only.primary_school)
        /* One national match with nothing to corroborate it is a guess, so it goes to review. */
        if (why) stateless.push({ identity: only, athlete: a, why })
        else review.push({ athlete: a, candidates: nationwide })
        continue
      }
      if (nationwide.length > 1) { review.push({ athlete: a, candidates: nationwide }); continue }
      /* Nobody of that name placed anywhere: still a real wrestler, just with no state on file. */
      create.push(a)
      continue
    }

    /* The profile's own name, then the wrestling name it also competes under. */
    const spellings = [...new Set([name, nn(a.wrestling_name)].filter(Boolean))]
    let hits: Identity[] = []
    for (const s of spellings) {
      hits = byPerson.get(`${s}|${state}|${gender}`) ?? []
      if (hits.length) break
    }
    if (hits.length === 1) { attach.push({ identity: hits[0], athlete: a, method: "exact_name_state_gender" }); continue }
    if (hits.length > 1) { review.push({ athlete: a, candidates: hits }); continue }

    const surname = name.split(" ").slice(-1)[0]
    const loose = (bySurname.get(`${surname}|${state}|${gender}`) ?? []).filter((c) =>
      spellings.some((s) => namesLikelySamePerson(String(c.normalized_name), s)),
    )
    if (loose.length === 1) { attach.push({ identity: loose[0], athlete: a, method: "fuzzy_surname_state_gender" }); continue }
    if (loose.length > 1) { review.push({ athlete: a, candidates: loose }); continue }
    create.push(a)
  }

  console.log(`profiles: ${athletes.length}`)
  console.log(`   unusable (no name, state or gender): ${unusable}`)
  console.log(`   already their own identity         : ${alreadyLinked}`)
  console.log(`   matched an existing identity       : ${attach.length}`)
  console.log(`      exact : ${attach.filter((x) => x.method === "exact_name_state_gender").length}`)
  console.log(`      fuzzy : ${attach.filter((x) => x.method === "fuzzy_surname_state_gender").length}`)
  console.log(`   need a new identity                : ${create.length}`)
  console.log(`   no state on the profile, one national match: ${stateless.length}`)
  for (const x of stateless) {
    const school = String(x.athlete.name)
    console.log(`      ${school.padEnd(20)} -> ${x.identity.state}  — ${x.why}`)
  }
  console.log(`   ambiguous, left for review         : ${review.length}`)
  for (const r of review.slice(0, 8)) {
    console.log(`      ${r.athlete.name} (${r.athlete.state ?? (r.athlete.is_nc_athlete ? "NC" : "no state on file")}) -> ${r.candidates.map((c) => `${c.normalized_name} ${c.graduation_year ?? "?"}`).join(" | ")}`)
  }
  if (attach.length) {
    console.log(`\nexamples of a profile meeting its own placer record:`)
    for (const x of attach.slice(0, 6)) console.log(`   ${String(x.athlete.name).padEnd(22)} -> ${x.identity.normalized_name} (${x.identity.state}, ${x.identity.gender}) via ${x.method}`)
  }

  if (!WRITE) { console.log("\nRe-run with --write."); return }

  let attached = 0
  for (const x of [...attach, ...stateless.map((s) => ({ ...s, method: "name_gender_nationwide" }))]) {
    const patch: Record<string, unknown> = { athlete_id: x.athlete.id, updated_at: new Date().toISOString() }
    /* Fill a class year the registry lacks; never overwrite one it already has. */
    if (!x.identity.graduation_year && x.athlete.graduationyear) patch.graduation_year = x.athlete.graduationyear
    const { error } = await sb.from("athlete_identities").update(patch).eq("id", x.identity.id)
    if (error) { console.error(`attach ${x.athlete.name} FAILED:`, error.message); return }
    attached++
  }
  console.log(`attached to an existing identity: ${attached}`)

  const rows = create.map((a) => {
    const name = nn(a.name)
    const words = name.split(" ")
    return {
      canonical_name: String(a.name).trim(),
      normalized_name: name,
      first_name: words[0] ?? null,
      last_name: words.length > 1 ? words[words.length - 1] : null,
      /* NC for our own athletes; null for an out-of-state profile we could not place. */
      state: (a.state ?? "").trim().toUpperCase() || (a.is_nc_athlete ? "NC" : null),
      gender: a.gender,
      graduation_year: a.graduationyear ?? null,
      athlete_id: a.id,
      identity_confirmed: true, /* a curated profile is the one source we do not have to guess at */
      evidence: { from: "athletes", matcher_version: MATCHER },
    }
  })
  let made = 0
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await sb.from("athlete_identities").insert(rows.slice(i, i + 500) as never)
    if (error) { console.error(`insert batch at ${i} FAILED:`, error.message); return }
    made += rows.slice(i, i + 500).length
  }
  console.log(`new identities created from profiles: ${made}`)

  const { count } = await sb.from("athlete_identities").select("id", { count: "exact", head: true }).not("athlete_id", "is", null)
  console.log(`\nidentities carrying one of our profiles: ${count}`)
}
main().catch((e) => { console.error("FAILED:", e.message); process.exit(1) })
