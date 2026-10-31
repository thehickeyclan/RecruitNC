#!/usr/bin/env npx tsx
/**
 * South Carolina dual-meet bouts from SCMAT's monthly scoreboards.
 *
 * SC dual results are not a public feed anywhere — not RankWrestlers, not Track — and SCMAT
 * carries "some but not all" of them (Alan). Muse's extraction parses the December–February
 * scoreboards and the State Duals champions pages into 101 bouts whose BOTH sides resolve to a
 * canonical South Carolina identity: 64 of them are pairs that never met in the RankWrestlers
 * season logs, and 119 wrestlers gain at least one bout they did not have.
 *
 * Why these are worth their own importer rather than the generic one: they are duals, not a
 * bracket. There is no round, no bout number and no seed — the only position a bout has is which
 * dual it was wrestled in.
 *
 * **Admin only. These never render publicly** (Matt, 29 Oct 2026). They go to `scmat_dual_bouts`,
 * which has row level security on and no select policy, so the browser cannot read it and only
 * the service role can — the same shape as the commitment job's operational tables. They are a
 * ranking and research input, not profile content: nothing here writes to
 * `other_tournament_bouts`, which every public profile reads.
 *
 * Two rules from the source that shape what is stored:
 *
 *   - **The score is not imported.** Muse's note is explicit that a few Track-export lines carry
 *     the running team score or a reversed bout score in the score field ("59-12", "16-30"), and
 *     that scores should be treated as decoration. Winner, loser and result type follow each
 *     page's winner-first convention and are reliable; a wrong score on a profile is worse than
 *     no score, so only the result type is kept.
 *   - **SCMAT never names anybody.** Every name, school and class year in the file is already
 *     ours — SCMAT's own print is kept in the audit file and nothing here reads it.
 *
 *   npx tsx scripts/import-scmat-dual-bouts.ts --file <scmat-matched-bouts.csv> [--write]
 */
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"
import { namesReferToSamePerson, schoolsLikelySame } from "@/lib/athlete-name-match"

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
const FILE = args.includes("--file") ? args[args.indexOf("--file") + 1]! : ""
const WRITE = args.includes("--write")
if (!FILE) throw new Error("--file <scmat-matched-bouts.csv>")

const SEASON = "2025-26"

function readCsv(file: string): Array<Record<string, string>> {
  const text = fs.readFileSync(file, "utf8").replace(/^﻿/, "")
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
  return body.filter((r) => r.length > 1).map((r) => Object.fromEntries(head!.map((h, i) => [h.trim(), (r[i] ?? "").trim()])))
}

async function page<T>(run: (a: number, b: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    let data: T[] | null = null
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const r = await run(from, from + 999)
        if (r.error) throw new Error(r.error.message)
        data = r.data
        break
      } catch (cause) {
        if (attempt === 4) throw cause
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)))
      }
    }
    out.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return out
}

type Athlete = { id: string; name: string; wrestling_name: string | null; highschool: string | null; graduationyear: number | null }

async function main() {
  const rows = readCsv(path.resolve(FILE))
  console.log(`${rows.length} bouts in the file`)

  const athletes = await page<Athlete>((a, b) =>
    sb.from("athletes").select("id, name, wrestling_name, highschool, graduationyear").eq("state", "SC").order("id").range(a, b))
  console.log(`${athletes.length} South Carolina profiles to match against\n`)

  /*
   * Name, school and - where the file carries one - class year. All three come from our own
   * canonical set, so a match is a lookup rather than a guess; a class year that disagrees is
   * a different wrestler, as in the state minter.
   */
  const find = (name: string, school: string, gradYear: string): Athlete | null => {
    const year = Number(gradYear) || null
    const named = athletes.filter((a) => namesReferToSamePerson(a.name, name) || (a.wrestling_name ? namesReferToSamePerson(a.wrestling_name, name) : false))
    const sameYear = named.filter((a) => !year || !a.graduationyear || a.graduationyear === year)
    const sameSchool = sameYear.filter((a) => schoolsLikelySame(a.highschool, school))
    if (sameSchool.length === 1) return sameSchool[0]!
    if (sameSchool.length > 1) return null
    /* A profile with no school on file cannot contradict one, inside the state. */
    const schoolless = sameYear.filter((a) => !String(a.highschool ?? "").trim())
    return schoolless.length === 1 ? schoolless[0]! : null
  }

  /*
   * One row per bout, not per side, because nothing public reads this: an admin looking at a
   * head-to-head wants the bout, and both wrestlers' ids are on it.
   */
  type Row = Record<string, unknown>
  const payload: Row[] = []
  const held: string[] = []
  let bothLinked = 0
  for (const r of rows) {
    const w = find(r.winner, r.winner_school, r.winner_grad_year)
    const l = find(r.loser, r.loser_school, r.loser_grad_year)
    if (!w && !l) { held.push(`${r.weight} ${r.winner} (${r.winner_school}) over ${r.loser} (${r.loser_school}) — neither side reaches a profile`); continue }
    if (w && l) bothLinked++
    payload.push({
      season: SEASON,
      source_page: r.month_or_event,
      source_url: r.source_url || null,
      context: r.context || null,
      weight: r.weight,
      winner_name: r.winner,
      winner_school: r.winner_school,
      winner_athlete_id: w?.id ?? null,
      loser_name: r.loser,
      loser_school: r.loser_school,
      loser_athlete_id: l?.id ?? null,
      result_type: r.result_type || null,
      /* Deliberately null — see the header: SCMAT's score field is decoration, not data. */
      score: null,
      rw_log_status: r.rw_log_status || null,
    })
  }
  const profiles = new Set(payload.flatMap((p) => [p.winner_athlete_id, p.loser_athlete_id]).filter(Boolean).map(String))
  console.log(`bouts to write: ${payload.length} · both sides on a profile: ${bothLinked} · profiles touched: ${profiles.size}`)
  console.log(`bouts where neither side reaches a profile: ${held.length}`)
  for (const h of held.slice(0, 6)) console.log(`   ${h}`)
  if (held.length > 6) console.log(`   … ${held.length - 6} more`)

  if (!WRITE) return console.log("\nDry run. --write to apply.")
  const { error: clearErr } = await sb.from("scmat_dual_bouts").delete().eq("season", SEASON)
  if (clearErr) throw new Error(`clearing scmat_dual_bouts: ${clearErr.message}. Has scripts/create-scmat-dual-bouts.sql been run?`)
  for (let i = 0; i < payload.length; i += 200) {
    const { error } = await sb.from("scmat_dual_bouts").insert(payload.slice(i, i + 200) as never)
    if (error) throw error
  }
  console.log(`\nwrote ${payload.length} bouts to scmat_dual_bouts (admin only)`)
}
main().catch((e) => { console.error(e); process.exit(1) })
