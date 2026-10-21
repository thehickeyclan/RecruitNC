#!/usr/bin/env npx tsx
/**
 * Add championship seasons we do not hold yet, from Muse's workbook (21 Oct 2026: VISAA 2024 and
 * 2026). Placer rows (every entrant, place blank for non-placers) and their division.
 *
 * It REFUSES a season/association/gender that already has rows: those carry class years and
 * profile links, and import-state-placement-bout-workbook.ts rebuilds placers without them. This
 * only ever adds. The Flo wrestler id comes from the delivery's bout CSVs (Winner/Loser ID), so the
 * championship bouts link to these rows later.
 *
 *   npx tsx scripts/import-state-placers-new-slices.ts --workbook <wb.json> --bouts <bouts-csv dir> --state VA --slice 2024:VISAA:Boys [--slice ...] [--places 8] [--write]
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
const WB = val("--workbook")
const BOUTS = val("--bouts")
const PLACES = Number(val("--places") ?? "0") || null
const SLICES = args.flatMap((a, i) => (a === "--slice" ? [args[i + 1]] : [])).map((s) => {
  const [season, association, gender] = s.split(":")
  return { season: Number(season), association, gender }
})
const WRITE = args.includes("--write")
if (!STATE || !WB || !BOUTS || !SLICES.length) throw new Error("--state --workbook --bouts --slice season:ASSOC:Gender")

const norm = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim()

function readCsv(file: string): Array<Record<string, string>> {
  const text = fs.readFileSync(file, "utf8").replace(/^﻿/, "")
  const out: string[][] = []
  let row: string[] = [], cell = "", q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) { if (c === '"' && text[i + 1] === '"') (cell += '"'), i++; else if (c === '"') q = false; else cell += c }
    else if (c === '"') q = true
    else if (c === ",") row.push(cell), (cell = "")
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell), out.push(row), (row = []), (cell = "") }
    else cell += c
  }
  if (cell || row.length) row.push(cell), out.push(row)
  const [head, ...body] = out
  return body.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? "").trim()])))
}

async function main() {
  const wb = JSON.parse(fs.readFileSync(WB!, "utf8")) as Record<string, unknown[][]>
  const [ph, ...pr] = wb.placers as string[][]
  const placers = pr.map((r) => Object.fromEntries(ph.map((h, i) => [h, r[i]]))) as Array<Record<string, string | null>>
  const [eh, ...er] = wb.events_and_divisions as string[][]
  const events = er.map((r) => Object.fromEntries(eh.map((h, i) => [h, r[i]]))) as Array<Record<string, string>>
  const bouts = fs.readdirSync(BOUTS!).filter((f) => f.endsWith(".csv")).flatMap((f) => readCsv(path.join(BOUTS!, f)))

  for (const sl of SLICES) {
    const { count } = await sb.from("state_tournament_placers").select("*", { count: "exact", head: true }).eq("state", STATE).eq("season", sl.season).eq("association", sl.association).eq("gender", sl.gender)
    if (count) {
      console.log(`${sl.season} ${sl.association} ${sl.gender}: REFUSED, ${count} rows already held (they carry class years and links)`)
      continue
    }
    const rows = placers.filter((p) => Number(p.Season) === sl.season && p.State === STATE && p.Association === sl.association && p.Gender === sl.gender)
    const ev = events.find((e) => Number(e.Season) === sl.season && e.Association === sl.association && e.Gender === sl.gender)
    // Flo id per wrestler in this slice, from the bouts.
    const flo = new Map<string, string>()
    for (const b of bouts.filter((b) => Number(b.Season) === sl.season && b.Association === sl.association && b.Gender === sl.gender)) {
      if (b.Winner && b["Winner ID"]) flo.set(`${norm(b.Winner)}|${norm(b["Winner School"])}`, b["Winner ID"])
      if (b.Loser && b["Loser ID"]) flo.set(`${norm(b.Loser)}|${norm(b["Loser School"])}`, b["Loser ID"])
    }
    const classes = [...new Set(rows.map((r) => String(r.Classification)))]
    const divisions = classes.map((c) => ({ season: sl.season, state: STATE, association: sl.association, gender: sl.gender, classification: c, places_awarded: PLACES ?? Math.max(...rows.filter((r) => r.Place).map((r) => Number(r.Place))), source_url: ev?.["Source URL"] ?? null }))
    const out = rows.map((r) => {
      const id = flo.get(`${norm(r.Wrestler)}|${norm(r.School)}`) ?? null
      return {
        season: sl.season, state: STATE, association: sl.association, gender: sl.gender, classification: r.Classification,
        weight: String(r["Weight Class"]), place: r.Place ? Number(r.Place) : null, wrestler_name: r.Wrestler, school_raw: r.School,
        source_athlete_id: id, source_athlete_id_source: id ? "floarena" : null, source_url: ev?.["Source URL"] ?? null,
      }
    })
    console.log(`${sl.season} ${sl.association} ${sl.gender}: ${out.length} entrants, ${out.filter((r) => r.place).length} placers, ${out.filter((r) => r.source_athlete_id).length} with a Flo id; divisions ${classes.join(", ")} (places ${divisions[0]?.places_awarded})`)
    if (!WRITE) continue
    const d = await sb.from("state_tournament_divisions").insert(divisions as never)
    if (d.error) throw d.error
    for (let i = 0; i < out.length; i += 400) {
      const { error } = await sb.from("state_tournament_placers").insert(out.slice(i, i + 400) as never)
      if (error) throw error
    }
    console.log("   written (undo: delete this season/association/gender's placers, then its division)")
  }
  if (!WRITE) console.log("\nDry run. --write to apply.")
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
