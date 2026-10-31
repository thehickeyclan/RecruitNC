#!/usr/bin/env npx tsx
/**
 * Fill state placers' class years from Muse's resolution files (21 Oct 2026).
 *
 * The SC readiness gate found eight 2026 SCISA placers with no profile and no class year on the
 * placer row, though Muse's files had resolved every one (seven "SCMAT 2026 Sr", one Flo's 2026
 * SCISA bracket "HS Senior"). resolve-sc-placer-class-years.ts reads RankWrestlers only; this reads
 * Muse's files, which also carry tournament-printed grades.
 *
 * Rules (the state launch playbook):
 *   - Only rows marked resolved, with a class year and evidence.
 *   - Name and school must both agree (school: same key, a prefix, or two letters apart).
 *   - Fill only: a class year already on the row is never changed.
 *   - A tournament-printed grade beats a ranking's. Any other disagreement is held and printed,
 *     never forced in.
 *   - --write saves every row it changes to ranking-snapshots/ first (the undo log).
 *
 *   npx tsx scripts/apply-state-grad-year-file.ts --state SC --file a.csv [--file b.csv] [--write]
 *   npx tsx scripts/apply-state-grad-year-file.ts --state VA --from-registry [--write]
 *
 * --from-registry reads the identity registry instead (athlete_identities: the state's
 * RankWrestlers import, 21 Oct 2026 for Virginia), with the same rules.
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
const STATE = (args[args.indexOf("--state") + 1] ?? "").toUpperCase()
const FILES = args.flatMap((a, i) => (a === "--file" ? [args[i + 1]] : []))
const WRITE = args.includes("--write")
const FROM_REGISTRY = args.includes("--from-registry")
if (!STATE || (!FILES.length && !FROM_REGISTRY)) throw new Error("--state XX --file path [--file path] | --from-registry")

const norm = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim()
const schoolKey = (s: unknown) => norm(s).replace(/\b(high school|hs|high|school|schools|charter|academy|comprehensive|sr)\b/g, "").replace(/\s+/g, "")
function editDistance(x: string, y: string): number {
  const d: number[][] = Array.from({ length: x.length + 1 }, (_, i) => [i, ...Array(y.length).fill(0)])
  for (let j = 1; j <= y.length; j++) d[0][j] = j
  for (let i = 1; i <= x.length; i++) for (let j = 1; j <= y.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1))
  return d[x.length][y.length]
}
function schoolsAgree(a: unknown, b: unknown): boolean {
  const x = schoolKey(a), y = schoolKey(b)
  if (!x || !y) return false
  if (x === y || x.startsWith(y) || y.startsWith(x)) return true
  return Math.abs(x.length - y.length) <= 2 && editDistance(x, y) <= 2
}

/** A small CSV reader: quoted fields, commas and doubled quotes inside them. */
function readCsv(file: string): Array<Record<string, string>> {
  const text = fs.readFileSync(file, "utf8")
  const rows: string[][] = []
  let row: string[] = [], cell = "", q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"' && text[i + 1] === '"') (cell += '"'), i++
      else if (c === '"') q = false
      else cell += c
    } else if (c === '"') q = true
    else if (c === ",") row.push(cell), (cell = "")
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++
      row.push(cell), rows.push(row), (row = []), (cell = "")
    } else cell += c
  }
  if (cell || row.length) row.push(cell), rows.push(row)
  const [head, ...body] = rows
  return body.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? "").trim()])))
}

type Claim = { year: number; tournament: boolean; evidence: string; file: string; school: string }
const claims = new Map<string, Claim[]>()
for (const file of FILES) {
  for (const r of readCsv(file)) {
    /* `grad_year` in the resolution files of 21 Oct, `class_year` in the ones since. */
    const year = r.grad_year ?? r.class_year ?? ""
    if (r.status !== "resolved" || !/^\d{4}$/.test(year)) continue
    const k = norm(r.name)
    // Flo's participant list prints the grade the event published: the tournament's word.
    const tournament = /Flo participants|grade '/i.test(r.evidence ?? "")
    claims.set(k, [...(claims.get(k) ?? []), { year: Number(year), tournament, evidence: r.evidence ?? "", file: path.basename(file), school: r.school ?? "" }])
  }
}

/** The registry's class years for the state, as claims (a ranking's grade, not a tournament's). */
async function registryClaims() {
  for (let f = 0; ; f += 1000) {
    const { data, error } = await sb.from("athlete_identities").select("canonical_name, primary_school, graduation_year, source_athlete_id_source").eq("state", STATE).not("graduation_year", "is", null).order("id").range(f, f + 999)
    if (error) throw error
    for (const r of data ?? []) {
      const k = norm(r.canonical_name)
      claims.set(k, [...(claims.get(k) ?? []), { year: Number(r.graduation_year), tournament: false, evidence: `identity registry (${r.source_athlete_id_source ?? "registry"})`, file: "athlete_identities", school: r.primary_school ?? "" }])
    }
    if (!data || data.length < 1000) break
  }
}

async function main() {
  if (FROM_REGISTRY) await registryClaims()
  const rows: Array<{ id: string; wrestler_name: string; school_clean: string | null; school_raw: string | null; season: number; association: string | null; place: number | null }> = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await sb.from("state_tournament_placers").select("id, wrestler_name, school_clean, school_raw, season, association, place").eq("state", STATE).is("grad_year", null).order("id").range(f, f + 999)
    if (error) throw error
    rows.push(...((data ?? []) as never[]))
    if (!data || data.length < 1000) break
  }
  const fills: Array<{ id: string; name: string; year: number; why: string }> = []
  const held: string[] = []
  for (const r of rows) {
    const school = r.school_clean ?? r.school_raw
    const mine = (claims.get(norm(r.wrestler_name)) ?? []).filter((c) => schoolsAgree(c.school, school))
    if (!mine.length) continue
    const years = new Set(mine.map((c) => c.year))
    let year: number | null = null
    let why = mine[0].evidence
    if (years.size === 1) year = mine[0].year
    else {
      const t = new Set(mine.filter((c) => c.tournament).map((c) => c.year))
      if (t.size === 1) {
        year = [...t][0]
        why = `tournament grade wins: ${mine.find((c) => c.tournament)!.evidence}`
      } else held.push(`${r.wrestler_name} (${school}, ${r.season}): ${[...years].join(" vs ")} — held`)
    }
    /*
     * A year that puts the wrestler at this championship before his freshman year is refused.
     *
     * The same test the readiness gate applies afterwards (scripts/state-readiness.ts): an
     * independent association admits 7th and 8th graders, a state's public association does not.
     * Six South Carolina years arrived this way on 31 Oct - five SCHSL qualifiers whose only
     * evidence was a grade of "Fr" read from the FOLLOWING season, which makes an 8th grader of
     * each, plus one the same shape in reverse. Of 2,876 South Carolina rows, all 22 sitting
     * before a freshman year are SCISA and not one is SCHSL, so six cases of one shape is an
     * offset in how a grade is dated rather than six unprecedented wrestlers. The row keeps its
     * blank year until a dated record from a placed season says otherwise.
     */
    const independent = /(ISA|VISAA)$/i.test(r.association ?? "")
    const early = year == null ? 0 : year - 3 - r.season
    if (year != null && early > (independent ? 2 : 0)) {
      held.push(
        `${r.wrestler_name} (${school}, ${r.season} ${r.association ?? ""}): ${year} would be ` +
          `${early} year${early === 1 ? "" : "s"} before his freshman season — held, not applied`,
      )
      continue
    }
    if (year) fills.push({ id: r.id, name: `${r.wrestler_name} (${school}, ${r.season} ${r.association ?? ""} #${r.place ?? "-"})`, year, why })
  }
  console.log(`${rows.length} ${STATE} rows with no class year; ${fills.length} filled from the files; ${held.length} held`)
  for (const f of fills.slice(0, 30)) console.log(`  ${f.name} -> ${f.year}  [${f.why.slice(0, 70)}]`)
  if (fills.length > 30) console.log(`  … and ${fills.length - 30} more`)
  for (const h of held) console.log(`  HELD ${h}`)
  if (!WRITE) return console.log("\nDry run. --write to apply.")
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
  const undo = `ranking-snapshots/${STATE.toLowerCase()}-placer-grad-years-undo-${stamp}.json`
  fs.mkdirSync("ranking-snapshots", { recursive: true })
  fs.writeFileSync(undo, JSON.stringify({ note: "These rows had grad_year null before; set it back to null to undo.", rows: fills }, null, 2))
  for (const f of fills) {
    const { error } = await sb.from("state_tournament_placers").update({ grad_year: f.year }).eq("id", f.id).is("grad_year", null)
    if (error) throw error
  }
  console.log(`\nWrote ${fills.length}. Undo log: ${undo}`)
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
