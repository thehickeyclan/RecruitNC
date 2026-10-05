#!/usr/bin/env npx tsx
/**
 * Class years from RankWrestlers, and identities for the wrestlers who never placed at state.
 *
 * The registry was built from state placers, so a wrestler who competed at NHSCA or Fargo but
 * never placed at his own state tournament has no identity at all — 18,316 of them. RankWrestlers
 * lists wrestlers whether or not they placed, and gives a grade, which is the one field that
 * separates two wrestlers of the same name in the same state.
 *
 * The class year is DERIVED from grade and season, never read from a column. These exports carry
 * a `class` column and it holds the school's classification — "5A", and "SC" in one export — so
 * reading it as a class year produces "class of SC".
 *
 * Three seasons are enough, which the bout data decides rather than taste: 59% of the unidentified
 * were last seen wrestling in 2025 or 2026 and are still in school, and a wrestler whose last bout
 * was 2024 is reached by the 2024-25 season if he stayed. Earlier seasons only add wrestlers who
 * have already graduated.
 *
 *   npx tsx scripts/import-rankwrestlers-grades.ts            # dry run
 *   npx tsx scripts/import-rankwrestlers-grades.ts --write
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
const DIR = process.argv.includes("--dir")
  ? process.argv[process.argv.indexOf("--dir") + 1]
  : `${process.env.HOME}/Downloads`
const nn = (raw: unknown) => nameWords(String(raw ?? "")).join(" ")

/** "2026-27 Early Preseason" -> 2027. The label is the file's own, not something asserted here. */
function seasonEndYear(label: string): number | null {
  const m = String(label ?? "").match(/(\d{4})-(\d{2})/)
  if (!m) return null
  return Number(m[1]) + 1
}
/** Seasons remaining after this one, so grade + season gives the class year. */
const GRADE_OFFSET: Record<string, number> = {
  sr: 0, senior: 0, "12": 0,
  jr: 1, junior: 1, "11": 1,
  so: 2, soph: 2, sophomore: 2, "10": 2,
  fr: 3, freshman: 3, "9": 3,
  "8th": 4, "8": 4,
  "7th": 5, "7": 5,
}
function gradYear(grade: string, seasonEnd: number): number | null {
  const off = GRADE_OFFSET[String(grade ?? "").trim().toLowerCase()]
  return off == null ? null : seasonEnd + off
}

function csv(file: string): Array<Record<string, string>> {
  const text = fs.readFileSync(file, "utf8").replace(/^﻿/, "").trim()
  const rows: string[][] = []
  let row: string[] = []
  let cur = ""
  let q = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++ }
      else if (ch === '"') q = false
      else cur += ch
    } else if (ch === '"') q = true
    else if (ch === ",") { row.push(cur); cur = "" }
    else if (ch === "\n") { row.push(cur); rows.push(row); row = []; cur = "" }
    else if (ch !== "\r") cur += ch
  }
  if (cur || row.length) { row.push(cur); rows.push(row) }
  const cols = (rows.shift() ?? []).map((c) => c.trim())
  return rows.filter((r) => r.some((c) => c.trim())).map((r) => Object.fromEntries(cols.map((c, i) => [c, (r[i] ?? "").trim()])))
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

type Person = {
  key: string
  name: string
  state: string
  gender: string
  schools: Set<string>
  /** season end year -> derived class year, so two seasons can be checked against each other. */
  years: Map<number, number>
  weights: Set<string>
}

async function main() {
  console.log(WRITE ? "WRITING\n" : "DRY RUN — nothing is written\n")

  const files = fs.readdirSync(DIR).filter((f) => /^rwcollect-.*\.csv$/.test(f) && !/-ZZ-/.test(f))
  if (!files.length) { console.log(`no rwcollect-*.csv in ${DIR}`); return }
  const people = new Map<string, Person>()
  let rowsRead = 0
  let noGrade = 0
  for (const f of files) {
    for (const r of csv(path.join(DIR, f))) {
      rowsRead++
      const name = nn(r.name)
      const state = String(r.state ?? "").trim().toUpperCase()
      const gender = r.gender === "Girls" ? "Female" : "Male"
      if (!name || !/^[A-Z]{2}$/.test(state)) continue
      const end = seasonEndYear(r.season)
      const gy = end ? gradYear(r.grade, end) : null
      if (!gy) noGrade++
      const key = `${name}|${state}|${gender}`
      if (!people.has(key)) people.set(key, { key, name, state, gender, schools: new Set(), years: new Map(), weights: new Set() })
      const p = people.get(key)!
      if (r.school) p.schools.add(r.school)
      if (r.weight) p.weights.add(r.weight)
      if (end && gy) p.years.set(end, gy)
    }
  }
  console.log(`files: ${files.length}   rows: ${rowsRead}   distinct wrestlers: ${people.size}`)
  console.log(`rows with no usable grade: ${noGrade}`)

  /*
   * A wrestler listed in two seasons must derive to the same class year. A disagreement means
   * either two wrestlers sharing a name or a mislabelled file, and either way the year is not
   * safe to write.
   */
  const agreed = new Map<string, number>()
  const disagreed: string[] = []
  for (const p of people.values()) {
    const years = [...new Set(p.years.values())]
    if (years.length === 1) agreed.set(p.key, years[0])
    else if (years.length > 1) disagreed.push(`${p.name} (${p.state}): ${[...p.years.entries()].map(([s, y]) => `${s}->${y}`).join(", ")}`)
  }
  console.log(`\nclass year agreed across seasons: ${agreed.size}`)
  console.log(`class year disagrees across seasons — not written: ${disagreed.length}`)
  for (const d of disagreed.slice(0, 8)) console.log(`   ${d}`)

  const identities = await page<{ id: string; normalized_name: string; state: string | null; gender: string | null; graduation_year: number | null; evidence: Record<string, unknown> | null }>(
    "athlete_identities",
    "id, normalized_name, state, gender, graduation_year, evidence",
  )
  const byKey = new Map<string, typeof identities>()
  for (const i of identities) {
    if (!i.normalized_name) continue
    const k = `${i.normalized_name}|${i.state}|${i.gender}`
    if (!byKey.has(k)) byKey.set(k, [])
    byKey.get(k)!.push(i)
  }

  const fillYear: Array<{ id: string; year: number }> = []
  const create: Person[] = []
  let alreadyHadYear = 0
  let ambiguous = 0
  for (const p of people.values()) {
    const hits = byKey.get(p.key) ?? []
    const year = agreed.get(p.key) ?? null
    if (hits.length > 1) { ambiguous++; continue }
    if (hits.length === 1) {
      if (hits[0].graduation_year) alreadyHadYear++
      else if (year) fillYear.push({ id: hits[0].id, year })
      continue
    }
    create.push(p)
  }

  console.log(`\nidentities that gain a class year : ${fillYear.length}`)
  console.log(`identities that already had one   : ${alreadyHadYear}`)
  console.log(`wrestlers with no identity yet    : ${create.length}`)
  console.log(`   of those, carrying a class year: ${create.filter((p) => agreed.has(p.key)).length}`)
  console.log(`ambiguous (two identities share the name, state and gender): ${ambiguous}`)

  if (!WRITE) { console.log("\nRe-run with --write."); return }

  let filled = 0
  for (const f of fillYear) {
    const { error } = await sb.from("athlete_identities").update({ graduation_year: f.year, updated_at: new Date().toISOString() }).eq("id", f.id)
    if (error) { console.error("fill FAILED:", error.message); return }
    filled++
  }
  console.log(`class years written: ${filled}`)

  const rows = create.map((p) => {
    const words = p.name.split(" ")
    return {
      canonical_name: p.name.split(" ").map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(" "),
      normalized_name: p.name,
      first_name: words[0] ?? null,
      last_name: words.length > 1 ? words[words.length - 1] : null,
      state: p.state,
      gender: p.gender,
      graduation_year: agreed.get(p.key) ?? null,
      primary_school: [...p.schools][0] ?? null,
      identity_confirmed: false,
      evidence: {
        from: "rankwrestlers",
        schools: [...p.schools],
        weights: [...p.weights],
        seasons: [...p.years.keys()].sort(),
        grade_derived_years: Object.fromEntries(p.years),
      },
    }
  })
  let made = 0
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await sb.from("athlete_identities").insert(rows.slice(i, i + 500) as never)
    if (error) { console.error(`insert at ${i} FAILED:`, error.message); return }
    made += rows.slice(i, i + 500).length
    if (made % 2500 === 0 || made === rows.length) console.log(`   created ${made}/${rows.length}`)
  }
  const { count } = await sb.from("athlete_identities").select("id", { count: "exact", head: true })
  const { count: withYear } = await sb.from("athlete_identities").select("id", { count: "exact", head: true }).not("graduation_year", "is", null)
  console.log(`\nathlete_identities: ${count} rows, ${withYear} with a class year`)
}
main().catch((e) => { console.error("FAILED:", e.message); process.exit(1) })
