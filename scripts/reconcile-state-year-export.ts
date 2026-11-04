#!/usr/bin/env npx tsx
/**
 * Diff a state's class years against one of Muse's dated-print reconciliation exports.
 *
 *   npx tsx scripts/reconcile-state-year-export.ts --state IA --file <export.csv>
 *   ...                                                                  --apply   fill blanks
 *
 * Coverage says a year EXISTS on a placer row. It does not say the year is RIGHT. These exports
 * carry the year each wrestler's own tournament grade prints derive, with the evidence string, so
 * they are the only instrument that can catch a wrong year rather than a missing one. Which is why
 * this reports disagreements loudly and never resolves one on its own: a disagreement is a question
 * for the evidence, not something to overwrite in either direction.
 *
 * Matching is name + gender, and a school that corroborates. School strings differ between the
 * export and our rows ("Ft. Worth Country Day School" / "Fort Worth Country Day"), so the test is
 * containment either way after folding. A name+gender that the export carries under two different
 * years is never applied - those are the namesake pairs the delivery notes name (Landon Smith in
 * Missouri, Ben/Benjamin Walsh in Iowa, the Verrett and Pulk athletes in Minnesota). A row that
 * matches on name and gender but on no school is reported and left alone.
 *
 * --apply only ever fills a BLANK year, and only with school corroboration. It never changes one.
 */
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"

for (const f of [".env.local", ".env"]) {
  const p = path.join(process.cwd(), f)
  if (!fs.existsSync(p)) continue
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
const args = process.argv.slice(2)
const val = (k: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : null)
const STATE = String(val("--state") ?? "").toUpperCase()
const FILE = val("--file")
const APPLY = args.includes("--apply")
if (!STATE || !FILE) throw new Error("need --state XX --file <export.csv>")

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let row: string[] = [], cell = "", q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ } else if (c === '"') q = false; else cell += c }
    else if (c === '"') q = true
    else if (c === ",") { row.push(cell); cell = "" }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = "" }
    else if (c !== "\r") cell += c
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  const [head, ...body] = rows
  return body.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? "").trim()])))
}

const norm = (s: unknown) => String(s ?? "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9 ]/g, " ").replace(/\b(jr|sr|ii|iii|iv)\b/g, " ").replace(/\s+/g, " ").trim()
const nameKey = (s: unknown) => norm(s).replace(/ /g, "")
const g = (s: unknown) => (/^f|girl|women/i.test(String(s ?? "")) ? "girls" : "boys")
/** School words that carry no identifying signal, so they never make two schools "agree". */
const STOP = new Set(["high", "school", "hs", "the", "of", "academy", "senior", "sr", "jr", "county", "co", "saint", "st"])
const schoolWords = (s: unknown) => new Set(norm(s).split(" ").filter((w) => w.length > 2 && !STOP.has(w)))
function schoolAgrees(a: unknown, b: unknown): boolean {
  const x = schoolWords(a), y = schoolWords(b)
  if (!x.size || !y.size) return false
  for (const w of x) if (y.has(w)) return true
  return false
}

async function main() {
  const exported = parseCsv(fs.readFileSync(FILE!, "utf8"))
  const placers: any[] = []
  for (let p = 0; ; p++) {
    const { data, error } = await sb.from("state_tournament_placers")
      .select("id,season,place,wrestler_name,school_clean,school_raw,gender,grad_year")
      .eq("state", STATE).order("id").range(p * 1000, p * 1000 + 999)
    if (error) throw new Error(error.message)
    placers.push(...data!)
    if (data!.length < 1000) break
  }
  const byName = new Map<string, any[]>()
  for (const r of placers) {
    const k = `${nameKey(r.wrestler_name)}|${g(r.gender)}`
    byName.set(k, [...(byName.get(k) ?? []), r])
  }

  // A name+gender the export carries under two different years is a namesake pair, never applied.
  const exportYears = new Map<string, Set<string>>()
  for (const e of exported) {
    const k = `${nameKey(e.wrestler_name)}|${g(e.gender)}`
    exportYears.set(k, (exportYears.get(k) ?? new Set()).add(e.class_year_final))
  }

  const agree: any[] = [], disagree: any[] = [], fill: any[] = [], noSchool: any[] = [], missing: any[] = [], ambiguous: any[] = []
  for (const e of exported) {
    const year = Number(e.class_year_final)
    const k = `${nameKey(e.wrestler_name)}|${g(e.gender)}`
    const hits = byName.get(k) ?? []
    if (!hits.length) { missing.push(e); continue }
    if (!year) continue // the export ships a named conflict with no year; nothing to compare
    const multi = (exportYears.get(k)?.size ?? 0) > 1
    for (const r of hits) {
      const corroborated = schoolAgrees(e.school, r.school_clean) || schoolAgrees(e.school, r.school_raw)
      if (!corroborated) { noSchool.push({ e, r }); continue }
      if (r.grad_year == null) {
        if (multi) ambiguous.push({ e, r })
        else fill.push({ e, r, year })
      } else if (Number(r.grad_year) === year) agree.push({ e, r })
      else disagree.push({ e, r, year })
    }
  }

  const placed = (x: any) => x.r?.place != null
  console.log(`\n${STATE} vs ${path.basename(FILE!)}: ${exported.length} exported keys, ${placers.length} placer rows\n`)
  console.log(`  agree                                  ${agree.length} rows (${agree.filter(placed).length} placed)`)
  console.log(`  DISAGREE - our year is not the print's  ${disagree.length} rows (${disagree.filter(placed).length} placed)`)
  console.log(`  fillable - ours blank, print has it     ${fill.length} rows (${fill.filter(placed).length} placed)`)
  console.log(`  blank, but the name is a namesake pair  ${ambiguous.length} rows`)
  console.log(`  name and gender match, no school does   ${noSchool.length} rows`)
  console.log(`  exported key with no row of ours        ${missing.length} keys`)

  if (disagree.length) {
    console.log(`\nDISAGREEMENTS - not changed by this script, each one is a question for the evidence:`)
    for (const d of disagree.slice(0, 40)) {
      console.log(`  ${d.e.wrestler_name} (${d.e.school}, ${d.e.gender}) season ${d.r.season} place ${d.r.place ?? "-"}: ours ${d.r.grad_year}, print says ${d.year}`)
      console.log(`     ${d.e.evidence_tier_or_source}`)
    }
    if (disagree.length > 40) console.log(`  ... and ${disagree.length - 40} more`)
  }
  if (ambiguous.length) {
    console.log(`\nNOT applied - the export carries this name under more than one year:`)
    for (const a of ambiguous) console.log(`  ${a.e.wrestler_name} (${a.e.school}, ${a.e.gender}) season ${a.r.season}`)
  }
  if (missing.length) {
    console.log(`\nExported keys with no placer row of ours (first 15):`)
    for (const m of missing.slice(0, 15)) console.log(`  ${m.wrestler_name} (${m.school}, ${m.gender}) ${m.seasons_placed}`)
    if (missing.length > 15) console.log(`  ... and ${missing.length - 15} more`)
  }

  if (!APPLY) return console.log(`\nDry run. --apply fills the ${fill.length} blank row(s); it never changes a year.`)
  let n = 0
  for (const f of fill) {
    const { error } = await sb.from("state_tournament_placers").update({ grad_year: f.year }).eq("id", f.r.id).is("grad_year", null)
    if (error) throw new Error(error.message)
    n++
  }
  console.log(`\nfilled ${n} blank class year(s). Disagreements left untouched: ${disagree.length}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
