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
 *   - Rows are matched on the Flo participant id (`source_athlete_id`) wherever the live row has
 *     one. The same id space runs through the brackets, the tabs and the rebuilt file, so a match
 *     is the same registration rather than a name that looks alike.
 *   - Where the live row has NO id, a second pass matches on season + weight + name. Whole slices
 *     were imported before we stored participant ids and no amount of evidence could reach them:
 *     Indiana's 2025 girls and both 2026 slices carry zero ids between them, so a container that
 *     filled Indiana perfectly landed 112 rows out of 448 and the state sat at 62.5%. Ohio's 2026,
 *     Wisconsin's 2026 and Illinois' girls are all the same shape - about 1,140 rows that the id
 *     match can never see. The fallback is fenced: the key must be unique on BOTH sides within the
 *     one season, so a weight with two wrestlers of the same name fills neither.
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

/**
 * The fallback key. Deliberately narrow: one season, one weight, one name. Not a fuzzy match -
 * the name must agree once apostrophes and punctuation are folded, and Flo mangles apostrophes
 * ("D?Ettore") so those are folded the way the rest of the platform folds them.
 */
const nameKey = (season: unknown, weight: unknown, name: string) =>
  [
    String(season ?? "").trim(),
    String(weight ?? "").trim(),
    String(name ?? "")
      .replace(/(?<=\p{L})[?\uFFFD](?=\p{L})/gu, "'")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim(),
  ].join("|")

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
  /** The same years keyed by season+weight+name, for live rows that carry no participant id. */
  const fileByName = new Map<string, { year: number; name: string } | null>()
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".csv")).sort()
  for (const f of files) {
    const rows = parseCsv(fs.readFileSync(path.join(DIR, f), "utf8"))
    const head = rows[0].map((h) => h.trim())
    const iId = head.indexOf("source_wrestler_id")
    const iYear = head.indexOf("grad_year") >= 0 ? head.indexOf("grad_year") : head.indexOf("class_year")
    const iFirst = head.indexOf("first_name"), iLast = head.indexOf("last_name")
    const iSeason = head.indexOf("season"), iWeight = head.indexOf("weight")
    if (iYear < 0) { console.log(`  ${f}: no grad_year column, skipped`); continue }
    for (const r of rows.slice(1)) {
      const id = (r[iId] ?? "").trim()
      const year = Number((r[iYear] ?? "").trim())
      if (!year) continue
      const name = `${r[iFirst] ?? ""} ${r[iLast] ?? ""}`.trim()
      if (id) fileYear.set(id, { year, name })
      if (iSeason >= 0 && iWeight >= 0 && name) {
        const k = nameKey(r[iSeason], r[iWeight], name)
        // A key two different wrestlers answer to is poisoned, not resolved.
        if (!fileByName.has(k)) fileByName.set(k, { year, name })
        else if (fileByName.get(k)!.year !== year) fileByName.set(k, null)
      }
    }
  }
  console.log(`${files.length} files · ${fileYear.size} participant ids carry a year in the rebuilt set`)

  const live: Array<Record<string, unknown>> = []
  let after: string | null = null
  for (let page = 0; page < 60; page++) {
    let q = sb
      .from("state_tournament_placers")
      .select("id, season, weight, wrestler_name, grad_year, source_athlete_id, athlete_id")
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

  /* How many live rows answer to each name key: a key two of ours share is refused too. */
  const liveKeyCount = new Map<string, number>()
  for (const r of live) {
    if (r.source_athlete_id) continue
    const k = nameKey(r.season, r.weight, String(r.wrestler_name ?? ""))
    liveKeyCount.set(k, (liveKeyCount.get(k) ?? 0) + 1)
  }

  const toFill: Array<{ id: string; year: number }> = []
  const disagree: string[] = []
  let noId = 0, noFileYear = 0, byName = 0, ambiguous = 0
  for (const r of live) {
    const sid = r.source_athlete_id ? String(r.source_athlete_id) : ""
    let hit = sid ? fileYear.get(sid) : undefined
    if (!sid) {
      // No id on our row: the id match can never see it. Fall back to season + weight + name.
      const k = nameKey(r.season, r.weight, String(r.wrestler_name ?? ""))
      const byNameHit = fileByName.get(k)
      if (byNameHit === null || (liveKeyCount.get(k) ?? 0) > 1) { ambiguous++; noId++; continue }
      if (!byNameHit) { noId++; continue }
      hit = byNameHit
      if (!r.grad_year) byName++
    }
    if (!hit) { noFileYear++; continue }
    if (r.grad_year) {
      // Never overwrite. A file that contradicts a year we hold is a disagreement for a human.
      if (Number(r.grad_year) !== hit.year) disagree.push(`${r.wrestler_name} (${r.season}) held ${r.grad_year} vs file ${hit.year}`)
      continue
    }
    toFill.push({ id: String(r.id), year: hit.year })
  }

  console.log(`would fill           : ${toFill.length}${byName ? ` (${byName} of them by season+weight+name, the row having no id)` : ""}`)
  if (ambiguous) console.log(`refused as ambiguous : ${ambiguous} (two wrestlers answer to one season+weight+name)`)
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
