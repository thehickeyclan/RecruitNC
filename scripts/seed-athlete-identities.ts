#!/usr/bin/env npx tsx
/**
 * Build the national identity registry: one row per real wrestler.
 *
 * Seeded from state_tournament_placers because it is the only store that carries a state AND a
 * gender on every row — the bout store keys people by a club or a state code depending on the
 * event, and carries no gender at all except in the event's name.
 *
 * The hard part is not matching, it is knowing when NOT to. Two different wrestlers with the same
 * name in the same state and no class year on either are indistinguishable from one person, and
 * class year is missing for 98.6% of placers. So rather than merge on a hunch, this looks for
 * evidence that a name belongs to two people and records the conflict instead of resolving it:
 *
 *  - the same name placing TWICE in one season and division (nobody places twice in one bracket)
 *  - a weight that moves further between seasons than a wrestler plausibly moves
 *
 * A conflicted identity is still written — results need something to hang from — but it is left
 * unconfirmed with the conflict in `evidence`, so a review surface can list exactly these.
 *
 *   npx tsx scripts/seed-athlete-identities.ts            # dry run
 *   npx tsx scripts/seed-athlete-identities.ts --write
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
/* Re-seedable: clears the rows this script created, never the hand-made stubs (no normalized_name). */
const RESET = process.argv.includes("--reset")

/** The product's own word splitter, so the registry key agrees with the matcher. */
const normName = (raw: unknown) => nameWords(String(raw ?? "")).join(" ")
/** The placer tables say Boys/Girls; athletes.gender says Male/Female, and reports read that. */
const GENDER: Record<string, string> = { Boys: "Male", Girls: "Female", Male: "Male", Female: "Female" }

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

type Placer = {
  wrestler_name: string
  state: string
  gender: string
  season: number
  classification: string | null
  weight: string | null
  place: number | null
  grad_year: number | null
  school_raw: string | null
  source_athlete_id: string | null
}

/*
 * Weight thresholds, calibrated against the real distribution of season-over-season moves rather
 * than picked. Of 6,165 moves, almost all are 0-30 lbs up; the spike of 47 at +70 is the 215->285
 * pattern, which is not a different wrestler — 285 is the unlimited heavyweight class, so a 220 lb
 * wrestler competes in it. A flat 45 lb rule flagged 76 of those and read as a namesake every time.
 *
 * Going UP into the top class is therefore never evidence. Coming DOWN a long way is: the tail of
 * -70, -80, -100 and one -140 is not a wrestler cutting weight, it is two people under one name.
 */
const TOP_WEIGHT = 285
const MAX_GAIN_PER_SEASON = 60
const MAX_LOSS_PER_SEASON = 50

function conflictOf(rows: Placer[]): string | null {
  /* Nobody places twice in one bracket — two rows there are two people. */
  const seen = new Map<string, number>()
  for (const r of rows) {
    const k = `${r.season}|${r.classification ?? ""}`
    seen.set(k, (seen.get(k) ?? 0) + 1)
  }
  const twice = [...seen.entries()].find(([, n]) => n > 1)
  if (twice) return `placed twice in ${twice[0].replace("|", " ")} — looks like two wrestlers sharing a name`

  const bySeason = [...rows]
    .filter((r) => Number(r.weight))
    .sort((a, b) => a.season - b.season)
  for (let i = 1; i < bySeason.length; i++) {
    const a = bySeason[i - 1]
    const b = bySeason[i]
    if (a.season === b.season) continue
    const from = Number(a.weight)
    const to = Number(b.weight)
    const seasons = Math.max(1, b.season - a.season)
    const perSeason = (to - from) / seasons
    /*
     * The unlimited class is not a weight, so neither direction across it is evidence. A wrestler
     * in the 285 bracket may weigh 220, so 215->285 is ordinary growth and 285->215 is the same
     * wrestler in a bracket that finally fits him. Flagging those read as a namesake 76 times.
     */
    if (to >= TOP_WEIGHT || from >= TOP_WEIGHT) continue
    if (perSeason > MAX_GAIN_PER_SEASON || -perSeason > MAX_LOSS_PER_SEASON) {
      return `weight moved ${from}->${to} between ${a.season} and ${b.season}`
    }
  }
  /* Two different class years under one name is two people, not one. */
  const years = new Set(rows.map((r) => r.grad_year).filter(Boolean))
  if (years.size > 1) return `two class years on file: ${[...years].join(", ")}`
  return null
}

async function main() {
  console.log(WRITE ? "WRITING\n" : "DRY RUN — nothing is written\n")

  const placers = await page<Placer>(
    "state_tournament_placers",
    "wrestler_name, state, gender, season, classification, weight, place, grad_year, school_raw, source_athlete_id",
  )
  console.log(`placer rows read: ${placers.length}`)

  const groups = new Map<string, Placer[]>()
  let unusable = 0
  for (const r of placers) {
    const n = normName(r.wrestler_name)
    const g = GENDER[String(r.gender)]
    if (!n || !r.state || !g) { unusable++; continue }
    const k = `${n}|${r.state}|${g}`
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(r)
  }
  if (unusable) console.log(`rows with no usable name/state/gender, skipped: ${unusable}`)
  console.log(`distinct (name, state, gender): ${groups.size}`)

  /*
   * An external id claimed by two different people is a broken id, not a merge instruction.
   *
   * RankWrestlers id 35079525132 sits on both "Luke Gray" and "James Gray" of South Carolina —
   * two wrestlers, near certainly brothers. Treating a shared id as proof of one person, which is
   * the obvious reading, would have fused them into a single identity carrying both their
   * records. So a contested id is dropped from every claimant and flagged instead.
   */
  const idClaimants = new Map<string, Set<string>>()
  for (const [key, rs] of groups) {
    for (const r of rs) {
      if (!r.source_athlete_id) continue
      const id = String(r.source_athlete_id)
      if (!idClaimants.has(id)) idClaimants.set(id, new Set())
      idClaimants.get(id)!.add(key)
    }
  }
  const contestedIds = new Set([...idClaimants.entries()].filter(([, keys]) => keys.size > 1).map(([id]) => id))
  if (contestedIds.size) {
    console.log(`\nexternal ids claimed by more than one wrestler — dropped from all of them: ${contestedIds.size}`)
    for (const id of contestedIds) console.log(`   ${id}: ${[...idClaimants.get(id)!].join("  ||  ")}`)
  }

  const rows: Array<Record<string, unknown>> = []
  const conflicts: Array<{ key: string; why: string; rows: number }> = []
  const incomplete: string[] = []
  for (const [key, rs] of groups) {
    const [n, state, gender] = key.split("|")
    const why = conflictOf(rs)
    if (why) conflicts.push({ key, why, rows: rs.length })
    /* The spelling that appears most often, so the display name is the common one. */
    const spellings = new Map<string, number>()
    for (const r of rs) spellings.set(r.wrestler_name.trim(), (spellings.get(r.wrestler_name.trim()) ?? 0) + 1)
    const canonical = [...spellings.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0]
    const words = n.split(" ")
    /*
     * A surname with no first name cannot identify anybody. Iowa's 2025 workbook was collected
     * from Trackwrestling's bracket viewer, which prints truncated surnames and school codes —
     * "Dietzenbac" of "BND" — so 335 of its 336 rows name a family, not a person. The identity is
     * still created, because the placement is real and has to hang somewhere, but it is marked so
     * no matcher ever links a result to it.
     */
    const nameIncomplete = words.length < 2
    if (nameIncomplete) incomplete.push(`${key}`)
    const years = [...new Set(rs.map((r) => r.grad_year).filter(Boolean))] as number[]
    const seasons = rs.map((r) => r.season).filter(Boolean)
    const srcIds = ([...new Set(rs.map((r) => r.source_athlete_id).filter(Boolean))] as string[])
      .filter((id) => !contestedIds.has(id))
    const schools = [...new Set(rs.map((r) => r.school_raw).filter(Boolean))] as string[]
    rows.push({
      canonical_name: canonical,
      normalized_name: n,
      first_name: words[0] ?? null,
      last_name: words.length > 1 ? words[words.length - 1] : null,
      state,
      gender,
      /* Only when the rows agree; a disagreement is a conflict, not a value to pick from. */
      graduation_year: years.length === 1 ? years[0] : null,
      primary_school: schools[0] ?? null,
      first_seen_season: seasons.length ? Math.min(...seasons) : null,
      last_seen_season: seasons.length ? Math.max(...seasons) : null,
      source_athlete_id: srcIds.length === 1 ? srcIds[0] : null,
      source_athlete_id_source: srcIds.length === 1 ? "rankwrestlers" : null,
      identity_confirmed: false,
      evidence: {
        placer_rows: rs.length,
        seasons: [...new Set(seasons)].sort(),
        weights: [...new Set(rs.map((r) => r.weight).filter(Boolean))],
        placements: rs.map((r) => r.place).filter((p) => p != null),
        schools,
        spellings: [...spellings.keys()],
        ...(why ? { conflict: why } : {}),
        ...(nameIncomplete ? { name_incomplete: "surname only in the source — not linkable" } : {}),
        ...(rs.some((r) => r.source_athlete_id && contestedIds.has(String(r.source_athlete_id)))
          ? { contested_source_id: rs.find((r) => r.source_athlete_id)!.source_athlete_id }
          : {}),
      },
    })
  }

  console.log(`\nidentities to write: ${rows.length}`)
  console.log(`   with a class year      : ${rows.filter((r) => r.graduation_year).length}`)
  console.log(`   with an external id    : ${rows.filter((r) => r.source_athlete_id).length}`)
  console.log(`   male / female          : ${rows.filter((r) => r.gender === "Male").length} / ${rows.filter((r) => r.gender === "Female").length}`)
  console.log(`   seen in >1 season      : ${rows.filter((r) => (r.first_seen_season as number) !== (r.last_seen_season as number)).length}`)
  console.log(`\nflagged for review — possibly two wrestlers sharing a name: ${conflicts.length}`)
  for (const c of conflicts.slice(0, 12)) console.log(`   ${c.key.padEnd(42)} ${c.why}`)
  console.log(`\nnot linkable — the source gives a surname with no first name: ${incomplete.length}`)
  const byStateIncomplete = new Map<string, number>()
  for (const k of incomplete) {
    const st = k.split("|")[1]
    byStateIncomplete.set(st, (byStateIncomplete.get(st) ?? 0) + 1)
  }
  console.log(`   ${[...byStateIncomplete.entries()].sort((a, b) => b[1] - a[1]).map(([st, n]) => `${st}=${n}`).join("  ")}`)

  if (!WRITE) { console.log("\nRe-run with --write to insert."); return }

  if (RESET) {
    const { error } = await sb.from("athlete_identities").delete().not("normalized_name", "is", null)
    if (error) { console.error("reset FAILED:", error.message); return }
    console.log("cleared the previously seeded rows")
  }

  let done = 0
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500)
    const { error } = await sb
      .from("athlete_identities")
      .upsert(batch as never, { onConflict: "normalized_name,state,gender,graduation_year", ignoreDuplicates: false })
    if (error) {
      /* The unique index is on COALESCE()s, which upsert cannot name; fall back to insert-ignore. */
      const { error: e2 } = await sb.from("athlete_identities").insert(batch as never)
      if (e2) { console.error(`batch at ${i} FAILED:`, e2.message); return }
    }
    done += batch.length
    if (done % 5000 === 0 || done === rows.length) console.log(`   written ${done}/${rows.length}`)
  }

  const { count } = await sb.from("athlete_identities").select("id", { count: "exact", head: true })
  console.log(`\nathlete_identities now holds ${count} rows`)
}
main().catch((e) => { console.error("FAILED:", e.message); process.exit(1) })
