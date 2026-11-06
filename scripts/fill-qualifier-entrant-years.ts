#!/usr/bin/env npx tsx
/**
 * Fill class years onto qualifier rows that have none, from a rebuilt qualifier set.
 *
 * The standard Matt set on 5 November 2026 is that no wrestler sits in the platform without a
 * grad year, and the gap was never evidence - it was application. The state builds resolved years
 * at PLACER depth, so Colorado shipped 1,426 of 3,796 entrant rows with a year while the
 * participants tabs behind it were graded for essentially every entrant. Muse now reships each
 * state as a complete qualifier set with the entrant years applied.
 *
 * Re-importing that set is the wrong way to land it. `import-state-qualifiers.ts` replaces a
 * slice, and a rebuilt file carries none of the profile links added after the original import -
 * its own guard refuses the write for exactly that reason ("WOULD LOSE ENRICHMENT"), which is how
 * Colorado's 446 linked rows survived this script's first attempt. So this fills in place instead:
 *
 *   - Rows are matched on the Flo participant id (`source_athlete_id`), not on a name. The same id
 *     space runs through the brackets, the tabs and the rebuilt file, so a match is the same
 *     registration rather than a name that looks alike.
 *   - FILL ONLY. A row that already carries a year is never changed, and a file that disagrees
 *     with a year we hold is printed as a disagreement and left alone. Re-issued files have been
 *     older than the database before (SC's 31 Oct addendum would have blanked 916 years).
 *   - Nothing but `grad_year` is written. Links, places, records and schools are untouched.
 *
 *   npx tsx scripts/fill-qualifier-entrant-years.ts --state CO --dir <final-qualifiers>
 *   npx tsx scripts/fill-qualifier-entrant-years.ts --state CO --dir <final-qualifiers> --write
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
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
})
const WRITE = process.argv.includes("--write")
const STATE = (process.argv[process.argv.indexOf("--state") + 1] ?? "").toUpperCase()
const DIR = process.argv[process.argv.indexOf("--dir") + 1] ?? ""
if (!STATE || !DIR || !fs.existsSync(DIR)) {
  console.error("--state XX --dir <final-qualifiers> are both required")
  process.exit(1)
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], cur = "", q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++ } else q = false } else cur += c
    } else if (c === '"') q = true
    else if (c === ",") { row.push(cur); cur = "" }
    else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = "" }
    else if (c !== "\r") cur += c
  }
  if (cur || row.length) { row.push(cur); rows.push(row) }
  return rows
}

async function main() {
  console.log(WRITE ? `WRITING — ${STATE}\n` : `DRY RUN — ${STATE}, nothing is written\n`)

  /** The rebuilt file's year for each Flo participant id, with the name for the printout. */
  const fileYear = new Map<string, { year: number; name: string }>()
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".csv")).sort()
  for (const f of files) {
    const rows = parseCsv(fs.readFileSync(path.join(DIR, f), "utf8"))
    const head = rows[0].map((h) => h.trim())
    const iId = head.indexOf("source_wrestler_id")
    const iYear = head.indexOf("grad_year") >= 0 ? head.indexOf("grad_year") : head.indexOf("class_year")
    const iFirst = head.indexOf("first_name"), iLast = head.indexOf("last_name")
    if (iId < 0 || iYear < 0) { console.log(`  ${f}: no source_wrestler_id or grad_year column, skipped`); continue }
    for (const r of rows.slice(1)) {
      const id = (r[iId] ?? "").trim()
      const year = Number((r[iYear] ?? "").trim())
      if (!id || !year) continue
      fileYear.set(id, { year, name: `${r[iFirst] ?? ""} ${r[iLast] ?? ""}`.trim() })
    }
  }
  console.log(`${files.length} files · ${fileYear.size} participant ids carry a year in the rebuilt set`)

  const live: Array<Record<string, unknown>> = []
  let after: string | null = null
  for (let page = 0; page < 60; page++) {
    let q = sb
      .from("state_tournament_placers")
      .select("id, season, wrestler_name, grad_year, source_athlete_id, athlete_id")
      .eq("state", STATE)
      .order("id")
      .limit(1000)
    if (after !== null) q = q.gt("id", after)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    live.push(...((data ?? []) as Array<Record<string, unknown>>))
    if (!data || data.length < 1000) break
    after = data[data.length - 1].id as string
  }
  const held = live.filter((r) => r.grad_year).length
  console.log(`${live.length} live rows · ${held} already carry a year · ${live.filter((r) => r.athlete_id).length} linked to a profile\n`)

  const toFill: Array<{ id: string; year: number }> = []
  const disagree: string[] = []
  let noId = 0, noFileYear = 0
  for (const r of live) {
    const sid = r.source_athlete_id ? String(r.source_athlete_id) : ""
    if (!sid) { noId++; continue }
    const hit = fileYear.get(sid)
    if (!hit) { noFileYear++; continue }
    if (r.grad_year) {
      // Never overwrite. A file that contradicts a year we hold is a disagreement for a human.
      if (Number(r.grad_year) !== hit.year) disagree.push(`${r.wrestler_name} (${r.season}) held ${r.grad_year} vs file ${hit.year}`)
      continue
    }
    toFill.push({ id: String(r.id), year: hit.year })
  }

  console.log(`would fill           : ${toFill.length}`)
  console.log(`already held, agreed : ${live.length - toFill.length - disagree.length - noId - noFileYear}`)
  console.log(`DISAGREEMENTS (left alone, for a human): ${disagree.length}`)
  if (disagree.length) console.log(`   ${disagree.slice(0, 40).join("\n   ")}`)
  console.log(`no participant id on the live row: ${noId}`)
  console.log(`no year for that id in the file  : ${noFileYear}`)
  const after_ = held + toFill.length
  console.log(`\ncoverage ${held}/${live.length} (${((held / live.length) * 100).toFixed(1)}%) -> ${after_}/${live.length} (${((after_ / live.length) * 100).toFixed(1)}%)`)

  if (!WRITE) { console.log(`\nRe-run with --write to fill ${toFill.length} rows.`); return }
  let done = 0
  for (const row of toFill) {
    const { error } = await sb.from("state_tournament_placers").update({ grad_year: row.year }).eq("id", row.id)
    if (error) { console.error(`  failed on ${row.id}: ${error.message}`); break }
    done++
    if (done % 500 === 0) console.log(`  ${done}...`)
  }
  console.log(`\nfilled ${done} rows`)
}
main()
