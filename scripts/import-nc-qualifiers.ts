#!/usr/bin/env npx tsx
/**
 * North Carolina's qualifiers, enriched into the table NC already lives in.
 *
 * NC is deliberately absent from `state_tournament_placers`: it lives in
 * `wrestling_nchsaa_results`, which 136 places in the code read and which already holds the 2025
 * entrant list. So this does not replace anything — it matches Muse's entrants to the rows we
 * have and adds what they bring (a win-loss record, a FloArena wrestler id), then inserts only
 * the entrants we were missing.
 *
 * Nothing is ever deleted here. The first version of the sister importer deleted a season before
 * its insert succeeded and destroyed 312 PA rows; against a table with 39 seasons of NC history
 * behind it, that is not a risk worth taking for any amount of convenience.
 *
 *   npx tsx scripts/import-nc-qualifiers.ts ~/Downloads/nc-2025-boys.csv ~/Downloads/nc-2025-girls.csv
 *   npx tsx scripts/import-nc-qualifiers.ts ... --write
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
const FILES = process.argv.slice(2).filter((a) => a.endsWith(".csv")).map((a) => a.replace(/^~/, process.env.HOME ?? "~"))
const nn = (raw: unknown) => nameWords(String(raw ?? "")).join(" ")

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

/* Their girls' bracket is "Open"; ours has always called it "Girls". One division, one name. */
const DIVISION: Record<string, string> = { open: "Girls" }
const divisionOf = (raw: string) => DIVISION[raw.trim().toLowerCase()] ?? raw.trim()

type Ours = {
  id: string
  wrestler_name: string
  classification: string | null
  weight_class: string | null
  place: number | null
  year: number
}

async function main() {
  console.log(WRITE ? "WRITING\n" : "DRY RUN — nothing is written\n")
  if (!FILES.length) { console.error("pass the NC CSV paths"); return }

  const theirs = FILES.flatMap((f) => csv(f))
  const seasons = [...new Set(theirs.map((r) => Number(r.season)))]
  if (seasons.length !== 1) { console.error(`expected one season, got ${seasons.join(", ")}`); return }
  const season = seasons[0]
  console.log(`their entrants: ${theirs.length} for the ${season} season`)

  const ours: Ours[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from("wrestling_nchsaa_results")
      .select("id, wrestler_name, classification, weight_class, place, year")
      .eq("year", season)
      .range(from, from + 999)
    if (error) throw new Error(error.message)
    ours.push(...((data ?? []) as Ours[]))
    if (!data || data.length < 1000) break
  }
  console.log(`rows we already hold for ${season}: ${ours.length}`)

  /* Keyed on the bracket, so a namesake in another weight cannot be mistaken for this wrestler. */
  const index = new Map<string, Ours[]>()
  for (const o of ours) {
    const k = `${o.classification}|${o.weight_class}`
    if (!index.has(k)) index.set(k, [])
    index.get(k)!.push(o)
  }

  const updates: Array<{ id: string; patch: Record<string, unknown>; who: string }> = []
  const inserts: Array<Record<string, unknown>> = []
  let ambiguous = 0

  for (const r of theirs) {
    const name = `${r.first_name} ${r.last_name}`.trim()
    const classification = divisionOf(r.division)
    const bracket = index.get(`${classification}|${r.weight}`) ?? []
    const wins = r.state_wins === "" ? null : Number(r.state_wins)
    const losses = r.state_losses === "" ? null : Number(r.state_losses)
    const patch = {
      wins, losses,
      record: wins != null && losses != null ? `${wins}-${losses}` : null,
      source_athlete_id: r.source_wrestler_id || null,
      source_athlete_id_source: r.source_wrestler_id ? String(r.source).toLowerCase() : null,
      association: "NCHSAA",
      updated_at: new Date().toISOString(),
    }
    let hits = bracket.filter((o) => nn(o.wrestler_name) === nn(name))
    if (!hits.length) hits = bracket.filter((o) => namesLikelySamePerson(String(o.wrestler_name), name))
    if (hits.length === 1) { updates.push({ id: hits[0].id, patch, who: `${name} (${classification} ${r.weight})` }); continue }
    if (hits.length > 1) { ambiguous++; continue }
    inserts.push({
      year: season,
      classification,
      weight_class: r.weight,
      place: Number(r.place) || null,
      wrestler_name: name,
      school: r.school || null,
      ...patch,
    })
  }

  console.log(`\n   rows we hold that gain a record and an id : ${updates.length}`)
  console.log(`   entrants we were missing, to be inserted  : ${inserts.length}`)
  console.log(`   ambiguous (two of ours in one bracket)    : ${ambiguous}`)
  console.log(`   rows of ours they do not cover            : ${ours.length - updates.length}  (NCISA is not in their collection)`)
  console.log(`\n   examples of what we gain:`)
  for (const u of updates.slice(0, 4)) console.log(`      ${u.who} -> ${u.patch.record}, id ${u.patch.source_athlete_id ?? "none"}`)
  for (const i of inserts.slice(0, 3)) console.log(`      NEW: ${i.wrestler_name} (${i.classification} ${i.weight_class}) ${i.record}`)

  if (!WRITE) { console.log("\nRe-run with --write."); return }

  let done = 0
  for (const u of updates) {
    const { error } = await sb.from("wrestling_nchsaa_results").update(u.patch).eq("id", u.id)
    if (error) { console.error(`update FAILED for ${u.who}: ${error.message}`); return }
    done++
  }
  console.log(`enriched: ${done}`)
  let made = 0
  for (let i = 0; i < inserts.length; i += 500) {
    const { error } = await sb.from("wrestling_nchsaa_results").insert(inserts.slice(i, i + 500) as never)
    if (error) { console.error(`insert FAILED: ${error.message}`); return }
    made += inserts.slice(i, i + 500).length
  }
  console.log(`inserted: ${made}`)
  const { count } = await sb.from("wrestling_nchsaa_results").select("id", { count: "exact", head: true }).eq("year", season)
  console.log(`NC ${season} now holds ${count} rows (was ${ours.length}; nothing was deleted)`)
}
main().catch((e) => { console.error("FAILED:", e.message); process.exit(1) })
