#!/usr/bin/env npx tsx
/**
 * Official final placements for the girls' divisions of two North Carolina freestyle events:
 * the 2026 NC Freestyle & Greco State Championships and the 2026 Tar Heel State Classic.
 *
 * Both ran round-robin pools, so a place cannot be read off a final bout, and the bout files we
 * imported covered only a few pools: 18 girls' result rows, against 184 official placings. Most of
 * the girls who placed were on file as "folkstyle only" (Olyvia Brown, Natalie Aiello, Olyve
 * Havens) when they had wrestled freestyle at their own state championship (13 October 2026).
 *
 * Reads Muse's CSVs (event, division, weight, place, name, club, school, grad_year, notes) from
 * USA Bracketing's Placements pages.
 *   - A result row we already hold gets its place, by its own weight heading.
 *   - A placer with no row gets one, placement only, when her name matches exactly one female
 *     profile. These are North Carolina state events and every female profile is an NC girl; a name
 *     shared by two profiles is reported, never guessed.
 *   - The site lists combined pools ("95-100") beside single weights, so a girl can be under two
 *     headings. She gets one row per event, at her better place.
 *   - A heading with one girl under it is uncontested. It never beats a contested pool she was
 *     also in (Nicole Davidson: "1st" alone at 100, 2nd of the 100-105 pool), and where it is all
 *     she has, the row records that she entered and gives no place.
 *   - Tar Heel 16U FS "105" shows all four as 4th (the real places are under "105a"): skipped.
 *
 *   npx tsx scripts/import-girls-event-placements.ts <dir-with-csvs>           # dry run
 *   npx tsx scripts/import-girls-event-placements.ts <dir-with-csvs> --write
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
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
})
const WRITE = process.argv.includes("--write")
const DIR = process.argv.slice(2).find((a) => !a.startsWith("--"))
if (!DIR) {
  console.error("usage: import-girls-event-placements.ts <dir> [--write]")
  process.exit(1)
}

type Division = { key: string; eventName: string; short: string; date: string }
const NC = (slug: string, label: string): Division => ({
  key: `nc-usaw-states-2026-${slug}`,
  eventName: `2026 NC Freestyle & Greco State Championships - ${label}`,
  short: "NC Freestyle & Greco State Championships",
  date: "2026-05-02",
})
const TH = (slug: string, label: string): Division => ({
  key: `tarheel-classic-2026-${slug}`,
  eventName: `2026 Tar Heel State Classic - ${label}`,
  short: "Tar Heel State Classic",
  date: "2026-04-18",
})
const DIVISIONS: Record<string, Division> = {
  "Team NC State Freestyle & Greco-Roman Championships|16U Freestyle": NC("16u-girls-fs", "16U Girls Freestyle"),
  "Team NC State Freestyle & Greco-Roman Championships|Junior Freestyle": NC("junior-girls-fs", "Junior Girls Freestyle"),
  "Team NC State Freestyle & Greco-Roman Championships|16U Greco": NC("16u-girls-gr", "16U Girls Greco"),
  "Team NC State Freestyle & Greco-Roman Championships|Junior Greco": NC("junior-girls-gr", "Junior Girls Greco"),
  "Tar Heel State Classic|16U Freestyle": TH("16u-girls-fs", "16U Girls Freestyle"),
  "Tar Heel State Classic|Junior Freestyle": TH("junior-girls-fs", "Junior Girls Freestyle"),
  "Tar Heel State Classic|16U Greco": TH("16u-girls-gr", "16U Girls Greco"),
  "Tar Heel State Classic|Junior Greco": TH("junior-girls-gr", "Junior Girls Greco"),
}

/** USA Wrestling's rosters misspell two girls; the school-side spelling is the profile's (Muse, 13 Oct 2026). */
const SPELLING: Record<string, string> = { "kate vazquez": "kate vasquez", "nevaeh willamson": "nevaeh williamson" }

const norm = (s: unknown) => {
  const n = String(s ?? "").toLowerCase().normalize("NFKD").replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim()
  return SPELLING[n] ?? n
}

function cells(line: string): string[] {
  const out: string[] = []
  let cur = ""
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!
    if (c === '"') {
      if (quoted && line[i + 1] === '"') { cur += '"'; i++ } else quoted = !quoted
    } else if (c === "," && !quoted) { out.push(cur.trim()); cur = "" } else cur += c
  }
  out.push(cur.trim())
  return out
}

type Placing = { division: Division; weight: string; place: number; name: string; club: string; file: string }

async function main() {
  const placings: Placing[] = []
  for (const file of fs.readdirSync(DIR!).filter((f) => f.endsWith(".csv"))) {
    const lines = fs.readFileSync(path.join(DIR!, file), "utf8").replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim())
    for (const line of lines.slice(1)) {
      const c = cells(line)
      const division = DIVISIONS[`${c[0]}|${c[1]}`]
      const place = Number(c[3])
      if (!division) throw new Error(`Unknown division: ${c[0]} | ${c[1]}`)
      if (!Number.isInteger(place) || place < 1 || !c[4]) continue
      // The page prints every wrestler in this pool as 4th; the real places are under "105a".
      if (/all four wrestlers/i.test(c[8] ?? "")) continue
      placings.push({ division, weight: c[2]!, place, name: c[4]!, club: c[5] ?? "", file })
    }
  }

  const girls: Array<{ id: string; name: string; graduationyear: number | null; highschool: string | null }> = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from("athletes").select("id, name, graduationyear, highschool").eq("gender", "Female").order("id").range(from, from + 999)
    if (error) throw error
    if (!data?.length) break
    girls.push(...(data as never[]))
    if (data.length < 1000) break
  }
  const byName = new Map<string, typeof girls>()
  for (const g of girls) byName.set(norm(g.name), [...(byName.get(norm(g.name)) ?? []), g])

  const keys = [...new Set(Object.values(DIVISIONS).map((d) => d.key))]
  const { data: existing, error: exError } = await sb
    .from("other_tournament_results")
    .select("id, event_key, athlete_name, athlete_id, weight_class, placement")
    .in("event_key", keys)
  if (exError) throw exError

  const report = { placed: 0, created: 0, noProfile: 0, held: [] as string[] }

  // 1. Rows we already hold: the place under the row's own weight heading, else her better one.
  const hasRow = new Set<string>()
  for (const row of existing ?? []) {
    hasRow.add(`${row.event_key}|${norm(row.athlete_name)}`)
    const hers = placings.filter((p) => p.division.key === row.event_key && norm(p.name) === norm(row.athlete_name))
    const exact = hers.find((p) => p.weight === String(row.weight_class))
    const place = exact?.place ?? (hers.length ? Math.min(...hers.map((p) => p.place)) : null)
    if (place == null || Number(row.placement) === place) continue
    console.log(`${WRITE ? "place" : "would place"}  ${row.athlete_name.padEnd(22)} ${row.event_key}  ${row.weight_class}: ${place}`)
    if (WRITE) {
      const { error } = await sb.from("other_tournament_results").update({ placement: place, updated_at: new Date().toISOString() }).eq("id", row.id)
      if (error) throw error
    }
    report.placed++
  }

  // 2. Placers with no row: one row per girl per event, at her better place in a contested pool.
  const poolSize = new Map<string, number>()
  const lowestPlace = new Map<string, number>()
  for (const p of placings) {
    const k = `${p.division.key}|${p.weight}`
    poolSize.set(k, (poolSize.get(k) ?? 0) + 1)
    lowestPlace.set(k, Math.max(lowestPlace.get(k) ?? 0, p.place))
  }
  // A few headings show a 2nd and 3rd with no 1st displayed: the pool is at least as big as its last place.
  const sizeOf = (p: Placing) => {
    const k = `${p.division.key}|${p.weight}`
    return Math.max(poolSize.get(k) ?? 1, lowestPlace.get(k) ?? 1)
  }
  const better = (a: Placing, b: Placing) => {
    const ca = sizeOf(a) > 1
    const cb = sizeOf(b) > 1
    return ca !== cb ? ca : a.place < b.place
  }
  const best = new Map<string, Placing>()
  for (const p of placings) {
    const k = `${p.division.key}|${norm(p.name)}`
    if (hasRow.has(k)) continue
    const cur = best.get(k)
    if (!cur || better(p, cur)) best.set(k, p)
  }
  for (const p of best.values()) {
    const matches = byName.get(norm(p.name)) ?? []
    if (matches.length === 0) { report.noProfile++; continue }
    if (matches.length > 1) {
      report.held.push(`${p.name} (${p.division.eventName}, ${p.weight}, place ${p.place}): ${matches.length} profiles share the name`)
      continue
    }
    const girl = matches[0]!
    const contested = sizeOf(p) > 1
    console.log(`${WRITE ? "add" : "would add"}  ${girl.name.padEnd(22)} ${String(girl.graduationyear ?? "").padEnd(5)} ${(girl.highschool ?? "").padEnd(24)} ${p.division.eventName.replace("2026 ", "")}  ${p.weight}: ${contested ? `${p.place} of ${sizeOf(p)}` : "entered, uncontested"}`)
    if (WRITE) {
      const { error } = await sb.from("other_tournament_results").insert({
        event_key: p.division.key,
        event_name: p.division.eventName,
        event_short_name: p.division.short,
        event_state: "NC",
        event_date: p.division.date,
        year: 2026,
        athlete_name: girl.name,
        athlete_id: girl.id,
        club: p.club || null,
        gender: "F",
        weight_class: p.weight,
        placement: contested ? p.place : null,
        entrants: sizeOf(p),
        qualified: false,
        source_file: p.file,
        verification_status: "verified",
      })
      if (error) throw new Error(`${girl.name}: ${error.message}`)
    }
    report.created++
  }

  console.log(`\n${placings.length} official placings read. ${report.placed} existing rows ${WRITE ? "given" : "to be given"} a place; ${report.created} placement rows ${WRITE ? "added" : "to add"}; ${report.noProfile} placers have no profile (left out).`)
  if (report.held.length) console.log(`\nHeld, name shared by more than one profile (${report.held.length}):\n  ${report.held.join("\n  ")}`)
  if (!WRITE) console.log("\nDry run. Re-run with --write to apply.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
