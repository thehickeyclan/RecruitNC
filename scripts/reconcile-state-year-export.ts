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

/**
 * An export row carries the evidence that derived its year, and that evidence states its own
 * arithmetic: "'106 - Luke Houchins (Benedictine College Preparatory), Jr.' in 2024 -> class of
 * 2026". A wrestler printed a given grade in the season ENDING in that year graduates on a fixed
 * offset - a senior that year, a junior the next, and so on - so the claim can simply be checked.
 *
 * It is checked because it failed. Virginia's first discovery pass derived 17 of its 45 champions
 * from USA Wrestling's 2023-24 champions list and read that list as the 2024-25 season, so every
 * one of those years was a year late. Five of them contradicted years we already held, correctly,
 * and twelve more would have been written into blank rows with nothing to catch them. A row whose
 * own evidence does not derive the year it claims is never applied, whatever it agrees with.
 */
const GRADE_OFFSET: Record<string, number> = {
  sr: 0, senior: 0,
  jr: 1, junior: 1,
  so: 2, sophomore: 2,
  fr: 3, freshman: 3,
}
/**
 * The two shapes the evidence strings use. Both must be read, or the check reports silence as
 * cleanliness: the reconciliation exports write "2024: HS Junior -> 2025 (IHSAA 11731425)" and the
 * discovery passes write "'106 - Luke Houchins (Benedictine), Jr.' in 2024 -> class of 2026".
 * Checking only the second read five states as having no contradictions when it had not looked.
 */
const DERIVATIONS: RegExp[] = [
  /(Sr|Jr|So|Fr)\.'\s*in\s*(\d{4})\s*->\s*class of\s*(\d{4})/g,
  /(?:^|[^\d])(\d{4}):\s*(?:HS\s+)?(Freshman|Sophomore|Junior|Senior|Fr|So|Jr|Sr)\b[^>]*?->\s*(\d{4})/gi,
]
export function evidenceContradictsItself(evidence: string, claimed: number): string | null {
  const text = String(evidence ?? "")
  for (const [i, re] of DERIVATIONS.entries()) {
    for (const m of text.matchAll(re)) {
      // The first shape prints grade then season; the second prints season then grade.
      const grade = i === 0 ? m[1]! : m[2]!
      const season = i === 0 ? m[2]! : m[1]!
      const stated = m[3]!
      const off = GRADE_OFFSET[grade.toLowerCase()]
      if (off === undefined) continue
      const expected = Number(season) + off
      if (Number(stated) !== expected) {
        return `${grade} in the season ending ${season} graduates ${expected}, but the evidence says ${stated}`
      }
      if (Number(stated) !== claimed) {
        return `the evidence derives ${stated} but the row claims ${claimed}`
      }
    }
  }
  return null
}

const norm = (s: unknown) => String(s ?? "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9 ]/g, " ").replace(/\b(jr|sr|ii|iii|iv)\b/g, " ").replace(/\s+/g, " ").trim()
const nameKey = (s: unknown) => norm(s).replace(/ /g, "")
const g = (s: unknown) => (/^f|girl|women/i.test(String(s ?? "")) ? "girls" : "boys")
/**
 * School words that carry no identifying signal, so they never make two schools "agree". Geography
 * and qualifiers belong here: without "city", Ponca City and Oklahoma City corroborate on it, and
 * a false corroboration is how a namesake pair gets one wrestler's class year. A school whose every
 * word is on this list corroborates nothing and its rows are reported rather than applied, which is
 * the safe direction. Perry/Sperry and Moore/Westmoore are already safe - whole words, not
 * substrings - and that is deliberate (see the sibling-school rule).
 */
const STOP = new Set([
  "high", "school", "hs", "the", "of", "academy", "senior", "sr", "jr", "county", "co", "saint", "st",
  "city", "north", "south", "east", "west", "northeast", "northwest", "southeast", "southwest",
  "central", "christian", "catholic", "prep", "preparatory", "area", "regional", "consolidated",
  "community", "public", "charter", "middle", "junior", "varsity", "girls", "boys", "new", "old",
  "mount", "mt", "fort", "ft", "lake", "valley", "heights", "park", "hill", "hills", "grove", "ridge",
])
/**
 * The state's own name is a stopword too, derived from the state being reconciled. Arkansas holds
 * both "Arkansas High School" and "Central Arkansas Christian School" - two different schools whose
 * only shared word is the state - and Iowa, Michigan and Oklahoma all have the same shape. Without
 * this a wrestler at one could inherit the class year of a namesake at the other.
 */
const STATE_WORDS = new Set(
  (
    {
      AL: "alabama", AR: "arkansas", CT: "connecticut", DE: "delaware", FL: "florida", GA: "georgia",
      IA: "iowa", IN: "indiana", KY: "kentucky", LA: "louisiana", MA: "massachusetts", MD: "maryland",
      ME: "maine", MI: "michigan", MN: "minnesota", MO: "missouri", MS: "mississippi", NC: "carolina",
      NH: "hampshire", NJ: "jersey", NY: "york", OK: "oklahoma", PA: "pennsylvania", RI: "rhode island",
      SC: "carolina", TN: "tennessee", TX: "texas", VA: "virginia", VT: "vermont", WV: "virginia",
    } as Record<string, string>
  )[STATE]?.split(" ") ?? [],
)
const schoolWords = (s: unknown) =>
  new Set(norm(s).split(" ").filter((w) => w.length > 2 && !STOP.has(w) && !STATE_WORDS.has(w)))
/**
 * One school's words appearing as a run inside the other's, whole words only. This is what settles
 * the spelling variants - "Arkansas High" inside "Arkansas High School", "Central Arkansas
 * Christian" inside "Central Arkansas Christian School" - and it will not join "Arkansas High
 * School" to "Central Arkansas Christian School", which is the pair that matters. It is also the
 * rule that keeps Perry out of Sperry and Moore out of Westmoore.
 */
function wordRunInside(a: unknown, b: unknown): boolean {
  const x = norm(a).split(" ").filter(Boolean)
  const y = norm(b).split(" ").filter(Boolean)
  if (!x.length || !y.length) return false
  const [short, long] = x.length <= y.length ? [x, y] : [y, x]
  for (let i = 0; i + short.length <= long.length; i++) {
    if (short.every((w, j) => long[i + j] === w)) return true
  }
  return false
}
/**
 * Corroboration is containment first, then a shared distinctive word. The second is needed because
 * the two sides abbreviate differently - "Ft. Worth Country Day School" against "Fort Worth Country
 * Day" is no containment at all, since "ft" is not "fort" - and it is safe because the words that
 * carry no signal, the state's name among them, have been removed.
 */
function schoolAgrees(a: unknown, b: unknown): boolean {
  if (wordRunInside(a, b)) return true
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

  /*
   * Walk OUR rows, not the export's, so the school decides which exported person a row belongs to.
   *
   * A name+gender the export carries under two different years is a namesake pair, and the first
   * version of this skipped the pair outright. But the school already tells them apart: Missouri's
   * Landon Smith is Savannah class of 2027 and Moberly class of 2026, and his two unplaced rows
   * name their school. So a row is resolved by the exported rows whose school corroborates IT, and
   * held only when those still disagree among themselves - which is the real ambiguity.
   */
  const exportByName = new Map<string, Record<string, string>[]>()
  for (const e of exported) {
    const k = `${nameKey(e.wrestler_name)}|${g(e.gender)}`
    exportByName.set(k, [...(exportByName.get(k) ?? []), e])
  }
  const agree: any[] = [], disagree: any[] = [], fill: any[] = [], noSchool: any[] = [], missing: any[] = [], ambiguous: any[] = []
  const selfContradicting = new Map<string, string>()
  for (const e of exported) {
    const why = evidenceContradictsItself(e.evidence_tier_or_source ?? "", Number(e.class_year_final))
    if (why) selfContradicting.set(`${nameKey(e.wrestler_name)}|${g(e.gender)}|${norm(e.school)}`, `${e.wrestler_name} (${e.school}): ${why}`)
  }
  const seenKeys = new Set<string>()
  for (const r of placers) {
    const k = `${nameKey(r.wrestler_name)}|${g(r.gender)}`
    const cands = exportByName.get(k) ?? []
    if (!cands.length) continue
    seenKeys.add(k)
    const sameSchool = cands.filter((e) => schoolAgrees(e.school, r.school_clean) || schoolAgrees(e.school, r.school_raw))
    if (!sameSchool.length) { noSchool.push({ e: cands[0]!, r }); continue }
    const usable = sameSchool.filter((e) => !selfContradicting.has(`${nameKey(e.wrestler_name)}|${g(e.gender)}|${norm(e.school)}`))
    if (!usable.length) continue
    const years = [...new Set(usable.map((e) => Number(e.class_year_final)).filter(Boolean))]
    if (!years.length) continue // the export ships a named conflict with no year; nothing to compare
    const e = usable.find((x) => Number(x.class_year_final) === years[0])!
    if (years.length > 1) {
      /*
       * The corroborating exported rows disagree - a cross-key print conflict, where the same
       * wrestler's two school-form keys print different grades (Arkansas's Langley and Huerta). A
       * BLANK row is held: nothing here can choose. A row that already carries one of those years
       * is counted as agreeing, because it matches a key the export itself ships resolved; calling
       * it "held" would hide that it was checked.
       */
      if (r.grad_year != null && years.includes(Number(r.grad_year))) agree.push({ e, r })
      else ambiguous.push({ e, r, years })
      continue
    }
    const year = years[0]!
    if (r.grad_year == null) fill.push({ e, r, year })
    else if (Number(r.grad_year) === year) agree.push({ e, r })
    else disagree.push({ e, r, year })
  }
  for (const e of exported) if (!byName.has(`${nameKey(e.wrestler_name)}|${g(e.gender)}`)) missing.push(e)

  const placed = (x: any) => x.r?.place != null
  console.log(`\n${STATE} vs ${path.basename(FILE!)}: ${exported.length} exported keys, ${placers.length} placer rows\n`)
  console.log(`  agree                                  ${agree.length} rows (${agree.filter(placed).length} placed)`)
  console.log(`  DISAGREE - our year is not the print's  ${disagree.length} rows (${disagree.filter(placed).length} placed)`)
  console.log(`  fillable - ours blank, print has it     ${fill.length} rows (${fill.filter(placed).length} placed)`)
  console.log(`  held - corroborating rows disagree       ${ambiguous.length} rows`)
  console.log(`  name and gender match, no school does   ${noSchool.length} rows`)
  console.log(`  exported key with no row of ours        ${missing.length} keys`)
  if (selfContradicting.size) {
    console.log(`\nREFUSED - ${selfContradicting.size} exported key(s) whose own evidence does not derive the year they claim.`)
    console.log(`Nothing from these is applied or compared. A grade printed for a season ending in YYYY means:`)
    console.log(`Sr = YYYY, Jr = YYYY+1, So = YYYY+2, Fr = YYYY+3.`)
    for (const why of [...selfContradicting.values()].slice(0, 30)) console.log(`  ${why}`)
    if (selfContradicting.size > 30) console.log(`  ... and ${selfContradicting.size - 30} more`)
  }

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
    for (const a of ambiguous) console.log(`  ${a.e.wrestler_name} (${a.r.school_clean ?? a.r.school_raw}, ${a.e.gender}) season ${a.r.season}: the corroborating exported rows say ${a.years.join(" and ")}`)
  }
  if (missing.length) {
    console.log(`\nExported keys with no placer row of ours (first 15):`)
    for (const m of missing.slice(0, 15)) console.log(`  ${m.wrestler_name} (${m.school}, ${m.gender}) ${m.seasons_placed}`)
    if (missing.length > 15) console.log(`  ... and ${missing.length - 15} more`)
  }

  if (fill.length) {
    console.log(`\nBlank rows this would fill:`)
    for (const f of fill.slice(0, 25)) console.log(`  ${f.r.wrestler_name} (${f.r.school_clean ?? f.r.school_raw}) season ${f.r.season} place ${f.r.place ?? "-"} -> ${f.year}`)
    if (fill.length > 25) console.log(`  ... and ${fill.length - 25} more`)
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
