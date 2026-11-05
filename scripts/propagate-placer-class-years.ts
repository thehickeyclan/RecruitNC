#!/usr/bin/env npx tsx
/**
 * One wrestler, several rows, a class year on only some of them.
 *
 * A state tournament prints a grade for its placers and often not for the rest of the field, and it
 * prints one some years and not others. So the same boy arrives with a class year on his 2024 row
 * and a blank on the 2026 row that would actually mint him - and he gets no profile, because the
 * mint reads the season it is importing.
 *
 * Virginia's Yasmeen Khawaja is the case that found this: class of 2027 on her 2024 Fairfax row,
 * blank on her 2026 one, and so one of the two Fairfax wrestlers a coach could not find. Eleven
 * Virginia wrestlers were in that shape.
 *
 * The year moves only between rows that are the SAME WRESTLER by the rules used everywhere else -
 * same state, a name the matcher reads as one person, and a school it folds - and only ever into a
 * blank. A row that already carries a year is never touched, so nothing a source or an adjudication
 * decided can be overwritten here. Where a wrestler's own rows disagree, the group is skipped and
 * named: two different years on one person is a conflict to adjudicate, not to average.
 *
 *   npx tsx scripts/propagate-placer-class-years.ts --state VA [--write]
 */
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"
import { namesReferToSamePerson, nameWords, schoolsLikelySame } from "@/lib/athlete-name-match"
import { currentClassYears } from "@/lib/class-years"
import { isIndependentChampionship, normalizeState } from "@/lib/athlete-state"

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
const arg = (n: string) => {
  const i = process.argv.indexOf(`--${n}`)
  return i > 0 ? String(process.argv[i + 1]) : undefined
}
const KNOWN = new Set(["--state", "--write"])
for (const a of process.argv) if (a.startsWith("--") && !KNOWN.has(a)) throw new Error(`unknown flag ${a}`)
const STATE = normalizeState(arg("state"))
const WRITE = process.argv.includes("--write")
const CURRENT = currentClassYears()
const nn = (v: unknown) => nameWords(String(v ?? "")).join(" ").toLowerCase()

type Row = { id: string; season: number; wrestler_name: string; school_clean: string | null; school_raw: string | null; grad_year: number | null; place: number | null; association: string | null }

async function main() {
  if (!STATE) throw new Error("--state is required")
  const rows: Row[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from("state_tournament_placers")
      .select("id,season,wrestler_name,school_clean,school_raw,grad_year,place,association")
      .eq("state", STATE)
      .order("id")
      .range(from, from + 999)
    if (error) throw new Error(error.message)
    rows.push(...((data ?? []) as Row[]))
    if (!data || data.length < 1000) break
  }
  const schoolOf = (r: Row) => String(r.school_clean ?? r.school_raw ?? "").trim()

  /* Group by name, then split by school, exactly as the minter clusters. */
  const byName = new Map<string, Row[]>()
  for (const r of rows) {
    const k = nn(r.wrestler_name)
    byName.set(k, [...(byName.get(k) ?? []), r])
  }
  for (const [a, ra] of [...byName]) {
    if (!byName.has(a)) continue
    for (const [b, rb] of [...byName]) {
      if (b === a || !byName.has(b) || !byName.has(a)) continue
      if (!namesReferToSamePerson(ra[0]!.wrestler_name, rb[0]!.wrestler_name)) continue
      if (!schoolsLikelySame(schoolOf(ra[0]!), schoolOf(rb[0]!))) continue
      byName.set(a, [...byName.get(a)!, ...rb])
      byName.delete(b)
    }
  }
  const groups: Row[][] = []
  for (const [, rs] of byName) {
    const clusters: Row[][] = []
    for (const r of rs) {
      const fit = clusters.find((c) => schoolsLikelySame(schoolOf(c[0]!), schoolOf(r)))
      if (fit) fit.push(r)
      else clusters.push([r])
    }
    groups.push(...clusters)
  }

  const fills: Array<{ id: string; year: number; who: string }> = []
  const conflicts: string[] = []
  for (const g of groups) {
    const years = [...new Set(g.map((r) => r.grad_year).filter((y): y is number => !!y))]
    if (years.length > 1) {
      conflicts.push(`${g[0]!.wrestler_name} (${schoolOf(g[0]!)}): ${years.join(" vs ")} — skipped, needs adjudication`)
      continue
    }
    const year = years[0]
    if (!year || !CURRENT.includes(year)) continue
    for (const r of g) {
      if (r.grad_year) continue
      /*
       * Never into a season the year cannot reach. A class of Y wrestler is a freshman in season
       * Y-3, so Y-S greater than 3 puts the row in 8th grade or earlier - and the states we hold
       * bar 8th graders from varsity - EXCEPT the independent championships, which roster
       * middle-schoolers and where such a row is real. Seven Virginia rows at Benedictine, Cape
       * Henry, Greenbrier Christian, Grace Christian and Episcopal were cleared by a first,
       * blanket version of this rule and had to be put back.
       *
       * The first run of this script did exactly that: it gave Talen Hall of Grundy the class of
       * 2029 carried on another of his rows, which made him a state CHAMPION in 7th and 8th grade.
       * The readiness gate's pre-freshman check caught all four. A year that produces an impossible
       * season is evidence the year is wrong, not a blank to fill.
       */
      if (year - Number(r.season) > 3 && !isIndependentChampionship(STATE, r.association)) {
        conflicts.push(`${r.wrestler_name} (${schoolOf(r)}): class of ${year} would put his ${r.season} row in grade ${12 - (year - Number(r.season))} — not filled`)
        continue
      }
      fills.push({ id: r.id, year, who: `${r.season} ${r.wrestler_name} (${schoolOf(r)}) ${r.place == null ? "qualifier" : `#${r.place}`}` })
    }
  }

  console.log(`${STATE}: ${rows.length} rows in ${groups.length} wrestler group(s)`)
  console.log(`  blank rows that inherit a current class year: ${fills.length}`)
  for (const f of fills) console.log(`     ${f.who} -> class of ${f.year}`)
  if (conflicts.length) {
    console.log(`\n  groups whose own rows DISAGREE (not touched): ${conflicts.length}`)
    for (const c of conflicts) console.log(`     ${c}`)
  }
  if (!WRITE) return console.log("\n--write to apply.")

  let done = 0
  const byYear = new Map<number, string[]>()
  for (const f of fills) byYear.set(f.year, [...(byYear.get(f.year) ?? []), f.id])
  for (const [year, ids] of byYear) {
    for (let i = 0; i < ids.length; i += 200) {
      const { data, error } = await sb
        .from("state_tournament_placers")
        .update({ grad_year: year })
        .in("id", ids.slice(i, i + 200))
        .is("grad_year", null)
        .select("id")
      if (error) throw new Error(error.message)
      done += (data ?? []).length
    }
  }
  console.log(`\nfilled ${done}`)
}
main().catch((e) => {
  console.error(e.message ?? e)
  process.exit(1)
})
