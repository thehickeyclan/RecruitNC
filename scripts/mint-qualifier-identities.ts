#!/usr/bin/env npx tsx
/**
 * An identity for every state qualifier.
 *
 * The registry was seeded from placers, so it knows the podium and nobody else. The qualifier
 * collection adds 66,454 wrestlers who entered a state tournament and did not place — and, on 90%
 * of rows, a stable wrestler id from the bracket source. That id is what this is really for: it
 * survives a transfer and a name change, where (name, state) does not.
 *
 * The wrestler id in these files is NOT a person. It is a FloArena entry reference: of 26,875
 * wrestlers who qualified in more than one season, 22,881 carry a different id each season — Jade
 * Johnson of Washington is 19LQrKhsgVJnkwgs in 2025 and 11xEQED5ucSAqUht in 2026, same girl, same
 * weight. Grouping on it fragmented 112,843 rows into 111,020 "people", one per entry.
 *
 * So people are grouped by normalised name, state and gender, and the entry id stays on the placer
 * row as provenance rather than being promoted to an identity key. A per-entry id in a column
 * named source_athlete_id would read to everything downstream as a stable person key.
 *
 *   npx tsx scripts/mint-qualifier-identities.ts            # dry run
 *   npx tsx scripts/mint-qualifier-identities.ts --write
 */
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"
import { nameWords } from "@/lib/athlete-name-match"

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
const nn = (raw: unknown) => nameWords(String(raw ?? "")).join(" ")
const GENDER: Record<string, string> = { Boys: "Male", Girls: "Female" }

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

type Placer = {
  wrestler_name: string
  state: string
  gender: string
  season: number
  classification: string | null
  weight: string | null
  place: number | null
  school_raw: string | null
  source_athlete_id: string | null
  source_athlete_id_source: string | null
}
type Identity = {
  id: string
  normalized_name: string | null
  state: string | null
  gender: string | null
  source_athlete_id: string | null
  graduation_year: number | null
  primary_school: string | null
  evidence: Record<string, unknown> | null
}

async function main() {
  console.log(WRITE ? "WRITING\n" : "DRY RUN — nothing is written\n")

  const placers = await page<Placer>(
    "state_tournament_placers",
    "wrestler_name, state, gender, season, classification, weight, place, school_raw, source_athlete_id, source_athlete_id_source",
  )
  console.log(`qualifier rows: ${placers.length}`)

  /* An id claimed by two different names is broken, not a merge instruction. */
  const idNames = new Map<string, Set<string>>()
  for (const p of placers) {
    if (!p.source_athlete_id) continue
    const k = String(p.source_athlete_id)
    if (!idNames.has(k)) idNames.set(k, new Set())
    idNames.get(k)!.add(`${nn(p.wrestler_name)}|${p.state}`)
  }
  const contested = new Set([...idNames.entries()].filter(([, s]) => s.size > 1).map(([id]) => id))
  console.log(`external ids claimed by more than one wrestler, dropped: ${contested.size}`)

  type Person = {
    key: string
    name: string
    display: string
    state: string
    gender: string
    externalId: string | null
    idSource: string | null
    schools: Set<string>
    seasons: Set<number>
    weights: Set<string>
    places: number[]
    entryIds: string[]
  }
  const people = new Map<string, Person>()
  let unusable = 0
  for (const p of placers) {
    const name = nn(p.wrestler_name)
    const gender = GENDER[String(p.gender)]
    if (!name || name.split(" ").length < 2 || !p.state || !gender) { unusable++; continue }
    const ext = p.source_athlete_id && !contested.has(String(p.source_athlete_id)) ? String(p.source_athlete_id) : null
    const key = `n:${name}|${p.state}|${gender}`
    if (!people.has(key)) {
      people.set(key, {
        key, name, display: String(p.wrestler_name).trim(), state: p.state, gender,
        externalId: ext, idSource: p.source_athlete_id_source ?? null,
        schools: new Set(), seasons: new Set(), weights: new Set(), places: [], entryIds: [],
      })
    }
    const person = people.get(key)!
    if (p.school_raw) person.schools.add(p.school_raw)
    if (p.season) person.seasons.add(Number(p.season))
    if (p.weight) person.weights.add(String(p.weight))
    if (p.place != null) person.places.push(Number(p.place))
    if (ext) person.entryIds.push(ext)
  }
  console.log(`distinct wrestlers: ${people.size}   rows with no usable name/state/gender: ${unusable}`)
  console.log(`   carrying at least one entry id: ${[...people.values()].filter((p) => p.entryIds.length).length}`)

  const identities = await page<Identity>(
    "athlete_identities",
    "id, normalized_name, state, gender, source_athlete_id, graduation_year, primary_school, evidence",
  )
  const byExternal = new Map<string, Identity>()
  const byName = new Map<string, Identity[]>()
  for (const i of identities) {
    if (i.source_athlete_id) byExternal.set(String(i.source_athlete_id), i)
    if (!i.normalized_name) continue
    const k = `${i.normalized_name}|${i.state}|${i.gender}`
    if (!byName.has(k)) byName.set(k, [])
    byName.get(k)!.push(i)
  }
  console.log(`identities already held: ${identities.length}`)

  const updates: Array<{ id: string; patch: Record<string, unknown> }> = []
  const inserts: Array<Record<string, unknown>> = []
  let matchedById = 0
  let matchedByName = 0
  let ambiguous = 0

  for (const p of people.values()) {
    let hit: Identity | undefined
    {
      const cands = byName.get(`${p.name}|${p.state}|${p.gender}`) ?? []
      if (cands.length === 1) { hit = cands[0]; matchedByName++ }
      else if (cands.length > 1) { ambiguous++; continue }
    }
    const school = [...p.schools][0] ?? null
    if (hit) {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
      /* Only ever fill what is missing; never overwrite something already established. */
      /* No external id is written: an entry reference is not this wrestler's identity. */
      if (!hit.primary_school && school) patch.primary_school = school
      if (Object.keys(patch).length > 1) updates.push({ id: hit.id, patch })
      continue
    }
    const words = p.name.split(" ")
    inserts.push({
      canonical_name: p.display,
      normalized_name: p.name,
      first_name: words[0],
      last_name: words[words.length - 1],
      state: p.state,
      gender: p.gender,
      graduation_year: null,
      primary_school: school,
      source_athlete_id: null,
      source_athlete_id_source: null,
      first_seen_season: p.seasons.size ? Math.min(...p.seasons) : null,
      last_seen_season: p.seasons.size ? Math.max(...p.seasons) : null,
      identity_confirmed: false,
      evidence: {
        from: "state_qualifiers",
        schools: [...p.schools],
        seasons: [...p.seasons].sort(),
        weights: [...p.weights],
        placements: p.places,
        qualified_only: p.places.length === 0,
        /* Kept as provenance, clearly labelled as per-entry rather than per-person. */
        entry_ids: [...new Set(p.entryIds)].slice(0, 6),
      },
    })
  }

  console.log(`\n   (external ids are per entry, so they are not used to match)`)
  console.log(`   matched an existing identity by name        : ${matchedByName}`)
  console.log(`   of those, gaining an id or a school         : ${updates.length}`)
  console.log(`   new identities to mint                      : ${inserts.length}`)
  console.log(`      of which never placed                    : ${inserts.filter((i) => (i.evidence as any).qualified_only).length}`)
  console.log(`      of which never placed                    : ${inserts.filter((i) => (i.evidence as any).qualified_only).length}`)
  console.log(`   ambiguous (two identities share name/state/gender): ${ambiguous}`)

  if (!WRITE) { console.log("\nRe-run with --write."); return }

  let filled = 0
  for (const u of updates) {
    const { error } = await sb.from("athlete_identities").update(u.patch).eq("id", u.id)
    if (error) { console.log(`   update skipped: ${error.message.slice(0, 70)}`); continue }
    filled++
    if (filled % 5000 === 0) console.log(`   updated ${filled}/${updates.length}`)
  }
  console.log(`enriched: ${filled}`)

  let made = 0
  let rejected = 0
  for (let i = 0; i < inserts.length; i += 500) {
    const batch = inserts.slice(i, i + 500)
    const { error } = await sb.from("athlete_identities").insert(batch as never)
    if (error) {
      /* A batch can fail on one duplicate; fall back to row-by-row so the rest still lands. */
      for (const row of batch) {
        const { error: e2 } = await sb.from("athlete_identities").insert(row as never)
        if (e2) rejected++
        else made++
      }
    } else made += batch.length
    if (made % 10000 < 500) console.log(`   minted ${made}/${inserts.length}`)
  }
  console.log(`minted: ${made}   rejected as duplicates: ${rejected}`)
  const { count } = await sb.from("athlete_identities").select("id", { count: "exact", head: true })
  const { count: withId } = await sb.from("athlete_identities").select("id", { count: "exact", head: true }).not("source_athlete_id", "is", null)
  console.log(`\nathlete_identities: ${count} rows, ${withId} carrying a stable external id`)
}
main().catch((e) => { console.error("FAILED:", e.message); process.exit(1) })
