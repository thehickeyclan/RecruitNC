#!/usr/bin/env npx tsx
/**
 * Import the women's national results: Fargo, NHSCA girls, and Super 32 2021.
 *
 * None of these had ever been imported. Faith Bane is an NHSCA national champion and a Fargo
 * All-American and neither fact appeared anywhere on the site.
 *
 * North Carolina rows only, which is the convention the boys' tables already follow — the files
 * cover every state, and the out-of-state rows belong in the opponent index rather than here.
 *
 * Fargo's division names change every year for the same bracket ("16U Women", "16U Women
 * Freestyle", "16U Girls FS", "16U Girls"), so they are normalised on the way in. Four spellings
 * of one division would split every count that groups by it.
 *
 *   npx tsx scripts/import-girls-national-results.ts          # dry run
 *   npx tsx scripts/import-girls-national-results.ts --write
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
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)
const WRITE = process.argv.includes("--write")
const DIR = `${process.env.HOME}/Downloads`

function readCsv(file: string): Array<Record<string, string>> {
  const text = fs.readFileSync(path.join(DIR, file), "utf8").trim()
  const lines = text.split("\n")
  const cols = lines[0].split(",").map((c) => c.trim())
  return lines.slice(1).map((line) => {
    /* Quoted fields can contain commas; split on commas outside quotes. */
    const vals: string[] = []
    let cur = "", inQ = false
    for (const ch of line) {
      if (ch === '"') inQ = !inQ
      else if (ch === "," && !inQ) { vals.push(cur); cur = "" }
      else cur += ch
    }
    vals.push(cur)
    const row: Record<string, string> = {}
    cols.forEach((c, i) => (row[c] = (vals[i] ?? "").trim()))
    return row
  })
}

const isNC = (r: Record<string, string>) =>
  ["NC", "NORTH CAROLINA"].includes(String(r.state ?? "").trim().toUpperCase())
/*
 * Blank means "did not place", not zero.
 *
 * Number("") is 0 and 0 is finite, so the obvious version turned every blank placement into a
 * finish of 0 and then marked 62 wrestlers All-American for going 1-2. A missing result has to
 * stay missing.
 */
const num = (v: string) => {
  const s = String(v ?? "").trim()
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}
const text = (v: string) => { const s = String(v ?? "").trim(); return s ? s : null }

/** "16U Women", "16U Girls FS", "16U Women Freestyle" are one bracket wearing four names. */
function fargoDivision(raw: string): string {
  const s = raw.toLowerCase()
  const age = s.includes("16u") ? "16U" : "Junior"
  return `${age} Women's Freestyle`
}

async function main() {
  console.log(WRITE ? "WRITING\n" : "DRY RUN — nothing is written\n")

  // ---------- Fargo ----------
  const fargo = readCsv("fargo-womens-freestyle-2023-2026-all.csv").filter(isNC)
  const { data: fargoExisting } = await sb.from("fargo_results").select("year, athlete_name, weight_class")
  const fargoSeen = new Set((fargoExisting ?? []).map((r: any) => `${r.year}|${String(r.athlete_name).toLowerCase()}|${r.weight_class}`))
  const fargoRows = fargo
    .filter((r) => !fargoSeen.has(`${r.year}|${r.athlete_name.toLowerCase()}|${r.weight_class}`))
    .map((r) => ({
      year: num(r.year),
      athlete_name: r.athlete_name,
      division: fargoDivision(r.division),
      weight_class: text(r.weight_class),
      placement: num(r.placement),
      wins: num(r.wins),
      losses: num(r.losses),
      record: text(r.record),
      /* All-American is a podium, and the file's own placement is the only evidence for it. */
      is_all_american: num(r.placement) != null && num(r.placement)! <= 8,
      high_school: text(r.high_school),
      club: text(r.club),
      state: "NC",
      gender: "F",
      style: "FS",
      age_division: r.division.toLowerCase().includes("16u") ? "16U" : "Junior",
      event_name: `${r.year} US Marine Corps USAW 16U & Junior National Championships`,
      source_url: text(r.source_url),
      source_label: "FloWrestling",
    }))
  console.log(`Fargo:   ${fargo.length} NC rows in file, ${fargoRows.length} new, ${fargoRows.filter((r) => r.placement != null).length} with a placement`)

  // ---------- NHSCA ----------
  const nhsca = readCsv("nhsca-girls-nationals-2023-2026-all.csv").filter(isNC)
  const { data: nhscaExisting } = await sb.from("nhsca_placements").select("year, athlete_name, weight_class")
  const nhscaSeen = new Set((nhscaExisting ?? []).map((r: any) => `${r.year}|${String(r.athlete_name).toLowerCase()}|${r.weight_class}`))
  const nhscaRows = nhsca
    .filter((r) => !nhscaSeen.has(`${r.year}|${r.athlete_name.toLowerCase()}|${r.weight_class}`))
    .map((r) => ({
      year: num(r.year),
      tournament_name: text(r.tournament_name) ?? "NHSCA High School Nationals",
      athlete_name: r.athlete_name,
      division: "Girls",
      weight_class: text(r.weight_class),
      placement: num(r.placement),
      wins: num(r.wins),
      losses: num(r.losses),
      record: text(r.record),
      high_school: text(r.high_school),
      state: "NC",
      gender: "Female",
      source: "muze-import-2026-10",
      match_status: "unmatched",
    }))
  console.log(`NHSCA:   ${nhsca.length} NC rows in file, ${nhscaRows.length} new, ${nhscaRows.filter((r) => r.placement != null).length} with a placement`)

  // ---------- Super 32 2021 ----------
  const s32 = readCsv("super32-girls-2021-all.csv").filter(isNC)
  const { data: s32Existing } = await sb.from("super32_results").select("year, athlete_name, weight_class")
  const s32Seen = new Set((s32Existing ?? []).map((r: any) => `${r.year}|${String(r.athlete_name).toLowerCase()}|${r.weight_class}`))
  const s32Rows = s32
    .filter((r) => !s32Seen.has(`${r.year}|${r.athlete_name.toLowerCase()}|${r.weight_class}`))
    .map((r) => ({
      year: num(r.year),
      athlete_name: r.athlete_name,
      weight_class: text(r.weight_class),
      placement: num(r.placement),
      wins: num(r.wins),
      losses: num(r.losses),
      record: text(r.record),
      high_school: text(r.high_school),
      state: "NC",
      gender: "F",
    }))
  console.log(`Super32: ${s32.length} NC rows in file, ${s32Rows.length} new, ${s32Rows.filter((r) => r.placement != null).length} with a placement`)

  if (!WRITE) {
    console.log("\nSample of what would be written:")
    console.log("  fargo:", JSON.stringify(fargoRows[0]))
    console.log("  nhsca:", JSON.stringify(nhscaRows.find((r) => r.placement != null) ?? nhscaRows[0]))
    console.log("\nRe-run with --write to insert.")
    return
  }

  for (const [table, rows] of [["fargo_results", fargoRows], ["nhsca_placements", nhscaRows], ["super32_results", s32Rows]] as const) {
    if (!rows.length) { console.log(`${table}: nothing to insert`); continue }
    let inserted = 0
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await sb.from(table).insert(rows.slice(i, i + 200) as never)
      if (error) { console.error(`${table} FAILED:`, error.message); break }
      inserted += rows.slice(i, i + 200).length
    }
    console.log(`${table}: inserted ${inserted}`)
  }
}
main()
