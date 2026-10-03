#!/usr/bin/env npx tsx
/**
 * Give South Carolina's state placers a graduation year.
 *
 * `state_tournament_placers` holds 16,551 placers across 49 states and not one carries a class
 * year, which is the field everything downstream needs: the high-school window, class rankings,
 * star ratings, and the Fargo rows that will not render without one. South Carolina is the state
 * we are proving the method on before it runs anywhere else.
 *
 * Two sources, both RankWrestlers, both read from Matt's own signed-in session:
 *   - the ranking boards, swept per weight and saved as CSV (rw-SC-*.csv)
 *   - the wrestler search API, queried per placer (sc-rw-lookup.csv), which also returns a stable
 *     RankWrestlers id - a national identity key worth far more than name matching
 * They disagree about who they cover, so both are read: the boards carry wrestlers the search
 * missed and the search carries wrestlers below the boards' Top 100 cut.
 *
 * Grade is that season's grade. A senior on the 2026-27 board is class of 2027; on 2025-26 she is
 * class of 2026 (Matt). Never one fixed offset.
 *
 *   npx tsx scripts/resolve-sc-placer-class-years.ts           # dry run
 *   npx tsx scripts/resolve-sc-placer-class-years.ts --write
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

const norm = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim()
const normSchool = (s: unknown) =>
  norm(s).replace(/\b(high school|hs|high|school|charter|academy|comprehensive|sr)\b/g, "").replace(/\s+/g, " ").trim()

/** Grade to class year, from the season the grade was recorded in. */
const OFFSET: Record<string, number> = { Sr: 0, Jr: 1, So: 2, Fr: 3, "7th": 5 }
const gradYear = (grade: string, seasonEnd: number) => (grade in OFFSET ? seasonEnd + OFFSET[grade] : null)
/** The season dropdown's value: "current" is the 2026-27 preseason board. */
const seasonEnd = (season: string) => (season === "current" ? 2027 : Number(season) + 1)

type Found = { name: string; school: string; grad: number; grade: string; season: string; rwId: string | null; via: string }
/** A search row already knows which placer it was looked up for. */
type Direct = Found & { forName: string; forSchool: string }

/** Two school names as one key: "Broome H S" and "Broome", "Philip" and "Phillip" Simmons. */
const schoolKey = (s: unknown) => normSchool(s).replace(/\s+/g, "")
function editDistance(x: string, y: string): number {
  const d: number[][] = Array.from({ length: x.length + 1 }, (_, i) => [i, ...Array(y.length).fill(0)])
  for (let j = 1; j <= y.length; j++) d[0][j] = j
  for (let i = 1; i <= x.length; i++)
    for (let j = 1; j <= y.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1))
  return d[x.length][y.length]
}

function schoolsAgree(a: unknown, b: unknown): boolean {
  const x = schoolKey(a), y = schoolKey(b)
  if (!x || !y) return false
  if (x === y || x.startsWith(y) || y.startsWith(x)) return true
  // One letter doubled or dropped is the common case, so allow a small edit distance.
  if (Math.abs(x.length - y.length) > 2) return false
  return editDistance(x, y) <= 2
}

const csvRows = (file: string) => {
  const p = `${process.env.HOME}/Downloads/${file}`
  if (!fs.existsSync(p)) return []
  return fs.readFileSync(p, "utf8").trim().split("\n").slice(1).map((l) =>
    (l.match(/"((?:[^"]|"")*)"/g) ?? []).map((x) => x.slice(1, -1).replace(/""/g, '"')),
  )
}

function load(): { direct: Direct[]; pool: Found[] } {
  const direct: Direct[] = []
  const out: Found[] = []
  /*
   * The search API was queried per placer, with the school checked in the page before a result
   * was accepted. That match is the finding - re-deriving it here from the names alone throws it
   * away, which is how "Eddie Yambao" lost his own record to "Edgardo Yambao", and JD Cleapor
   * his to Joshua.
   */
  for (const c of csvRows("sc-rw-lookup.csv")) {
    const [forName, forSchool, , rwId, rwName, rwSchool, grade, season] = c
    if (!rwName || !grade || !season) continue
    const grad = gradYear(grade, seasonEnd(season))
    if (grad) direct.push({ forName, forSchool, name: rwName, school: rwSchool, grad, grade, season, rwId: rwId || null, via: "search" })
  }
  // The boards, which reach wrestlers the search did not return.
  for (const [file, season] of [["rw-SC-full-2026-27.csv", "current"], ["rw-SC-season2025-26.csv", "2025"]] as const) {
    for (const c of csvRows(file)) {
      const [, , name, school, grade] = c
      if (!name || !grade) continue
      const grad = gradYear(grade, seasonEnd(season))
      if (grad) out.push({ name, school, grad, grade, season, rwId: null, via: "board" })
    }
  }
  return { direct, pool: out }
}

async function main() {
  console.log(WRITE ? "WRITING\n" : "DRY RUN — nothing is written\n")
  const { direct, pool: found } = load()
  console.log(`RankWrestlers records: ${direct.length} from the search (looked up per placer), ${found.length} from the boards`)
  const bySearch = new Map<string, Direct>()
  for (const d of direct) bySearch.set(`${norm(d.forName)}|${schoolKey(d.forSchool)}`, d)

  const placers: any[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from("state_tournament_placers")
      .select("id,wrestler_name,school_raw,gender,place,weight,classification,grad_year")
      .eq("state", "SC")
      .order("id")
      .range(from, from + 999)
    if (error) throw new Error(error.message)
    placers.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }

  const byName = new Map<string, Found[]>()
  for (const f of found) byName.set(norm(f.name), [...(byName.get(norm(f.name)) ?? []), f])

  const updates: Array<{ id: string; grad: number; rwId: string | null; how: string; who: string }> = []
  const conflicts: string[] = []
  const missing: string[] = []
  const nearMisses: string[] = []

  for (const p of placers) {
    const label = `${p.wrestler_name} (${p.school_raw})`
    // What the search already resolved for this exact placer wins outright.
    const hit = bySearch.get(`${norm(p.wrestler_name)}|${schoolKey(p.school_raw)}`)
    if (hit) {
      updates.push({ id: p.id, grad: hit.grad, rwId: hit.rwId, how: "search", who: label })
      continue
    }
    const exact = byName.get(norm(p.wrestler_name)) ?? []
    // Same school is the evidence that makes a non-exact name safe; the product's own name rules
    // decide whether two spellings are one person.
    const sameSchool = found.filter((f) => schoolsAgree(f.school, p.school_raw) && namesLikelySamePerson(f.name, p.wrestler_name))
    /*
     * Last resort, and only where the school already agrees: one or two characters apart is a
     * typo, not a different wrestler. "Victor Washingtons" for Washington, "Audrey Naughten" for
     * Naughton, "Zadroga-McNulty" for "Zadroga Mcnulty". Each one is printed, because this is the
     * rule most likely to be wrong and a human should be able to see what it did.
     */
    const nearMiss = exact.length || sameSchool.length
      ? []
      : found.filter((f) => schoolsAgree(f.school, p.school_raw) && editDistance(norm(f.name), norm(p.wrestler_name)) <= 2)
    const pool = exact.length ? exact : sameSchool.length ? sameSchool : nearMiss
    if (nearMiss.length) nearMisses.push(`${label} = ${nearMiss[0].name} (${nearMiss[0].school})`)
    if (!pool.length) { missing.push(label); continue }
    const years = [...new Set(pool.map((f) => f.grad))]
    if (years.length !== 1) { conflicts.push(`${label}: ${years.sort().join(" / ")}`); continue }
    const rwId = pool.find((f) => f.rwId)?.rwId ?? null
    updates.push({ id: p.id, grad: years[0], rwId, how: exact.length ? "name" : "name+school", who: label })
  }

  const pct = (n: number) => `${n} (${Math.round((n / placers.length) * 100)}%)`
  console.log(`\nSC placers: ${placers.length}`)
  console.log(`  resolved            : ${pct(updates.length)}`)
  console.log(`    carrying a RW id  : ${updates.filter((u) => u.rwId).length}`)
  console.log(`  sources disagree    : ${pct(conflicts.length)}`)
  console.log(`  no record found     : ${pct(missing.length)}`)
  const byYear: Record<string, number> = {}
  for (const u of updates) byYear[u.grad] = (byYear[u.grad] ?? 0) + 1
  console.log(`  class years         : ${JSON.stringify(Object.fromEntries(Object.entries(byYear).sort()))}`)
  if (nearMisses.length) console.log(`\nmatched on a near-identical name at the same school (${nearMisses.length}):\n   ${nearMisses.join("\n   ")}`)
  if (conflicts.length) console.log(`\ndisagreements:\n   ${conflicts.join("\n   ")}`)
  if (missing.length) console.log(`\nno record (${missing.length}):\n   ${missing.slice(0, 25).join("\n   ")}`)

  if (!WRITE) { console.log("\nRe-run with --write to store."); return }

  let done = 0
  for (const u of updates) {
    const patch: Record<string, unknown> = { grad_year: u.grad, updated_at: new Date().toISOString() }
    // The RankWrestlers id is a national identity key: keep it, and say where it came from.
    if (u.rwId) { patch.source_athlete_id = u.rwId; patch.source_athlete_id_source = "rankwrestlers" }
    const { error } = await sb.from("state_tournament_placers").update(patch).eq("id", u.id)
    if (error) { console.error(`  failed ${u.who}: ${error.message}`); continue }
    done += 1
  }
  console.log(`\nwrote ${done} class years`)
}
main()
