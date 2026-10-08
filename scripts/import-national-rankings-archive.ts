#!/usr/bin/env npx tsx
/**
 * Load a past SI / MatScouts / Flo edition into national_rankings_archive - history only.
 *
 * The live table (national_rankings) is never touched: it is "ranked now", it feeds profiles and the
 * 5-star rule, and a 2025 list must not overwrite this season's. The archive answers "was the
 * opponent ranked on the day they wrestled" (Matt, 8 October 2026), so each edition needs the day
 * it was published.
 *
 * One file per edition. A CSV with a header row; columns are found by name, in any order:
 *   rank, name (or wrestler/athlete), school (or high_school/team), state, weight (or weight_class),
 *   grade or class (optional)
 * For a list that is not by weight, pass --scope p4p, or --scope big_board --class 2027.
 *
 *   npx tsx scripts/import-national-rankings-archive.ts --file si-girls-2026-03-01.csv \
 *     --source sports_illustrated --gender F --published 2026-03-01            # dry run
 *   ... --write
 */
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"
import { archiveEdition } from "@/lib/rankings/national-import"

for (const f of [".env.local", ".env"]) {
  const p = path.join(process.cwd(), f)
  if (!fs.existsSync(p)) continue
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
}

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const FILE = arg("file")
const SOURCE = arg("source")
const GENDER = arg("gender")
const PUBLISHED = arg("published")
const SCOPE = arg("scope") ?? "weight"
const CLASS = Number(arg("class") ?? 0)
const WRITE = process.argv.includes("--write")

if (!FILE || !SOURCE || !GENDER || !PUBLISHED) {
  console.error("usage: --file <csv> --source sports_illustrated|matscouts|flowrestling --gender M|F --published YYYY-MM-DD [--scope weight|p4p|big_board] [--class 2027] [--write]")
  process.exit(1)
}
if (!["sports_illustrated", "matscouts", "flowrestling"].includes(SOURCE)) throw new Error(`Unknown source ${SOURCE}`)
if (!["M", "F"].includes(GENDER)) throw new Error("--gender is M or F")
if (!/^\d{4}-\d{2}-\d{2}$/.test(PUBLISHED)) throw new Error("--published is YYYY-MM-DD, the day the edition came out")

/** A CSV line split on commas outside quotes. */
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

const lines = fs.readFileSync(FILE, "utf8").replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim())
const header = cells(lines[0]!).map((h) => h.toLowerCase().replace(/[^a-z_]/g, ""))
const col = (...names: string[]) => header.findIndex((h) => names.includes(h))
const iRank = col("rank", "rk")
const iName = col("name", "wrestler", "athlete", "athlete_name", "wrestler_name")
const iSchool = col("school", "high_school", "highschool", "team")
const iState = col("state", "st")
const iWeight = col("weight", "weight_class", "wt")
const iClass = col("class", "class_year", "grad_year", "year")
if (iRank < 0 || iName < 0) throw new Error(`Need rank and name columns; found: ${header.join(", ")}`)

const published = new Date(`${PUBLISHED}T12:00:00Z`)
const month = `${PUBLISHED.slice(0, 7)}-01`
const rows = lines.slice(1).map(cells).flatMap((c) => {
  const rank = Number.parseInt(c[iRank] ?? "", 10)
  const name = (c[iName] ?? "").trim()
  if (!Number.isFinite(rank) || !name) return []
  const cls = Number.parseInt(iClass >= 0 ? c[iClass] ?? "" : "", 10)
  return [{
    source: SOURCE,
    gender: GENDER,
    ranking_month: month,
    scope: SCOPE,
    edition_class_year: CLASS,
    rank_basis: SCOPE === "big_board" ? "overall" : "weight",
    rank,
    athlete_name: name,
    athlete_id: null,
    weight_class: iWeight >= 0 ? (c[iWeight] || null) : null,
    class_year: Number.isFinite(cls) && cls > 2000 ? cls : null,
    high_school: iSchool >= 0 ? (c[iSchool] || null) : null,
    state: iState >= 0 ? (c[iState]?.toUpperCase() || null) : null,
    source_url: null,
  }]
})

const states = new Set(rows.map((r) => r.state).filter(Boolean))
console.log(`${path.basename(FILE)}: ${rows.length} ranked wrestlers · ${SOURCE} ${GENDER} ${SCOPE}${CLASS ? ` ${CLASS}` : ""} · published ${PUBLISHED} (${published.toDateString()})`)
console.log(`  ${states.size} states; NC: ${rows.filter((r) => r.state === "NC").map((r) => `#${r.rank} ${r.athlete_name}`).join(", ") || "none"}`)

if (!WRITE) {
  console.log("Dry run. --write stores it in the archive only; current rankings are not touched.")
  process.exit(0)
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
})
archiveEdition(sb, rows, PUBLISHED, path.basename(FILE)).then((n) => {
  console.log(n === rows.length ? `Archived ${n}.` : `Archived ${n} of ${rows.length} - is the archive table created? (scripts/create-national-rankings-archive.sql)`)
})
