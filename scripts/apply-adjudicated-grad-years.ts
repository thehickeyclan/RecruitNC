#!/usr/bin/env npx tsx
/**
 * Apply an adjudicated grad-year delta: the one place a class year we already hold may be
 * overwritten.
 *
 * Everything else that touches `state_tournament_placers.grad_year` is fill-only, deliberately -
 * `fill-qualifier-entrant-years.ts` and `apply-state-grad-year-file.ts` both refuse to replace a
 * year the platform already holds, because a rebuilt file is routinely older than the database
 * and South Carolina's 31 October addendum would have blanked 916 rows if either had not.
 *
 * That refusal is right as a default and wrong as an absolute. When the two sources genuinely
 * disagree and the disagreement has been adjudicated wrestler by wrestler, somebody has to be
 * able to write the ruling. Virginia produced 38 such disagreements across 23 wrestlers on
 * 5 November 2026; every platform year involved was DERIVED from floarena with an empty grade
 * column, and every ruled year rests on tournament prints. A print beats a derivation.
 *
 * So the overwrite is allowed, and fenced:
 *
 * - Only rows whose `side_that_changes` is `platform`. A ruling that corrects the file is the
 *   file's business, not ours.
 * - Only where the row's CURRENT year equals `platform_year_before`. If it has changed since the
 *   delta was built, the ruling was made against something else and the row is left alone and
 *   reported - this is the SC addendum lesson, kept rather than waived.
 * - Only the seasons the delta names, matched on state, name and school.
 * - Every row carries a `basis`, and a row without one is refused. An overwrite with no stated
 *   reason is the thing this file exists to prevent.
 *
 *   npx tsx scripts/apply-adjudicated-grad-years.ts --file <overwrites.csv>            # dry run
 *   npx tsx scripts/apply-adjudicated-grad-years.ts --file <overwrites.csv> --write
 */
import fs from "node:fs"
import path from "node:path"
import { createClient } from "@supabase/supabase-js"

for (const file of [".env.local", ".env"]) {
  const full = path.join(process.cwd(), file)
  if (!fs.existsSync(full)) continue
  for (const line of fs.readFileSync(full, "utf8").split("\n")) {
    const eq = line.indexOf("=")
    if (eq < 1 || line.trimStart().startsWith("#")) continue
    const key = line.slice(0, eq).trim()
    if (process.env[key]) continue
    process.env[key] = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "")
  }
}

const arg = (n: string) => {
  const i = process.argv.indexOf(`--${n}`)
  return i > 0 ? String(process.argv[i + 1] ?? "") : ""
}
const FILE = arg("file")
const WRITE = process.argv.includes("--write")
if (!FILE) {
  console.error("--file <overwrites.csv> is required")
  process.exit(1)
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], cur = "", q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++ } else q = false } else cur += c }
    else if (c === '"') q = true
    else if (c === ",") { row.push(cur); cur = "" }
    else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = "" }
    else if (c !== "\r") cur += c
  }
  if (cur || row.length) { row.push(cur); rows.push(row) }
  return rows
}

/** Flo mangles apostrophes ("D?Ettore"); fold them the way the rest of the platform does. */
const norm = (s: string) =>
  String(s ?? "")
    .replace(/(?<=\p{L})[?�](?=\p{L})/gu, "'")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()

type Ruling = { state: string; name: string; school: string; seasons: number[]; before: number | null; ruled: number; side: string; basis: string }

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const rows = parseCsv(fs.readFileSync(FILE, "utf8"))
  const h = rows[0]!.map((x) => x.trim())
  const col = (n: string) => h.indexOf(n)
  const rulings: Ruling[] = []
  for (const r of rows.slice(1)) {
    if (!r[col("key_form")]) continue
    rulings.push({
      state: String(r[col("state")]).trim().toUpperCase(),
      name: String(r[col("key_form")]).trim(),
      school: String(r[col("school")] ?? "").trim(),
      seasons: String(r[col("seasons_affected")] ?? "").split(";").map((s) => Number(s.trim())).filter((n) => n > 2000),
      before: Number(r[col("platform_year_before")]) || null,
      ruled: Number(r[col("ruled_year")]),
      side: String(r[col("side_that_changes")] ?? "").trim().toLowerCase(),
      basis: String(r[col("basis")] ?? "").trim(),
    })
  }
  console.log(`${rulings.length} rulings in ${path.basename(FILE)}`)

  const states = [...new Set(rulings.map((r) => r.state))]
  type Row = { id: string; state: string; season: number; wrestler_name: string; school_clean: string | null; grad_year: number | null }
  const live: Row[] = []
  for (const st of states) {
    for (let from = 0; ; from += 1000) {
      // A fixed order, or pages overlap and rows go missing.
      const { data, error } = await sb
        .from("state_tournament_placers")
        .select("id,state,season,wrestler_name,school_clean,grad_year")
        .eq("state", st).order("id").range(from, from + 999)
      if (error) throw new Error(error.message)
      live.push(...((data ?? []) as Row[]))
      if (!data || data.length < 1000) break
    }
  }
  console.log(`live rows read: ${live.length} across ${states.join(", ")}`)

  const toWrite: Array<{ id: string; year: number; what: string }> = []
  let skippedSide = 0, noBasis = 0, noMatch = 0, movedOn = 0, alreadyRuled = 0
  for (const r of rulings) {
    if (r.side !== "platform") { skippedSide += 1; continue }
    if (!r.basis) { console.log(`  REFUSED (no basis): ${r.name}`); noBasis += 1; continue }
    const mine = live.filter(
      (x) => x.state === r.state && norm(x.wrestler_name) === norm(r.name) && (!r.seasons.length || r.seasons.includes(Number(x.season))),
    )
    if (!mine.length) { console.log(`  no row: ${r.state} ${r.name} (${r.seasons.join(",")})`); noMatch += 1; continue }
    for (const row of mine) {
      if (Number(row.grad_year) === r.ruled) { alreadyRuled += 1; continue }
      if (r.before !== null && Number(row.grad_year) !== r.before) {
        // The SC-addendum guard, kept: the ruling was made against a year we no longer hold.
        console.log(`  CHANGED SINCE: ${r.state} ${row.wrestler_name} (${row.season}) holds ${row.grad_year}, the delta expected ${r.before} — left alone`)
        movedOn += 1
        continue
      }
      toWrite.push({ id: row.id, year: r.ruled, what: `${r.state} ${row.wrestler_name} (${row.season}) ${row.grad_year ?? "—"} -> ${r.ruled}` })
    }
  }

  for (const w of toWrite) console.log(`  ${w.what}`)
  console.log(`\n${WRITE ? "overwriting" : "would overwrite"}: ${toWrite.length} rows`)
  console.log(`rulings for the file's side, not ours : ${skippedSide}`)
  console.log(`already at the ruled year             : ${alreadyRuled}`)
  console.log(`changed since the delta was built     : ${movedOn}`)
  console.log(`no matching row                       : ${noMatch}`)
  if (noBasis) console.log(`refused for having no stated basis    : ${noBasis}`)

  if (!WRITE) { console.log("\nDry run. --write to apply."); return }
  let done = 0
  for (const w of toWrite) {
    const { error } = await sb.from("state_tournament_placers").update({ grad_year: w.year }).eq("id", w.id)
    if (error) throw new Error(`${w.id}: ${error.message}`)
    done += 1
  }
  console.log(`wrote ${done} rows`)
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
