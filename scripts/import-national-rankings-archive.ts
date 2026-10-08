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
 * Or Muse's JSON, the live feed's shape - one edition, an array of them, or a folder of files:
 *   { source, gender, published: "YYYY-MM-DD", url?, scope?, classYear?, rows: [{ rank, name,
 *     weight?, school?, state?, grade? }] }
 *   npx tsx scripts/import-national-rankings-archive.ts --bundle ~/Downloads/rankings-2025-26 [--write]
 *
 * Never post past editions to /api/rankings/ingest: that is "ranked now", rejects prior seasons,
 * and must not be overwritten by them.
 *
 *   npx tsx scripts/import-national-rankings-archive.ts --file si-girls-2026-03-01.csv \
 *     --source sports_illustrated --gender F --published 2026-03-01            # dry run
 *   ... --write
 */
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"
import {
  archiveEdition,
  classYear,
  resolveEditionClassYear,
  resolveRankBasis,
  type IncomingRankingRow,
} from "@/lib/rankings/national-import"

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

const BUNDLE = arg("bundle")
if (BUNDLE) {
  const files = fs.statSync(BUNDLE).isDirectory()
    ? fs.readdirSync(BUNDLE).filter((f) => f.endsWith(".json")).sort().map((f) => path.join(BUNDLE, f))
    : [BUNDLE]
  type Edition = { source: string; gender: string; published: string; url?: string | null; scope?: string; classYear?: number | null; rows: IncomingRankingRow[] }
  const editions: Array<Edition & { file: string }> = files.flatMap((f) => {
    const parsed = JSON.parse(fs.readFileSync(f, "utf8"))
    const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.editions) ? parsed.editions : [parsed]
    return list.map((e: Edition) => ({ ...e, file: path.basename(f) }))
  })
  const sb = WRITE
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
    : null
  ;(async () => {
    let total = 0
    for (const e of editions) {
      const problems: string[] = []
      if (!["sports_illustrated", "matscouts", "flowrestling"].includes(e.source)) problems.push(`source ${e.source}`)
      if (!["M", "F"].includes(e.gender)) problems.push(`gender ${e.gender}`)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(e.published))) problems.push(`published ${e.published}`)
      if (!Array.isArray(e.rows) || !e.rows.length) problems.push("no rows")
      const label = `${e.file}: ${e.source} ${e.gender} ${e.scope ?? "weight"}${e.classYear ? ` ${e.classYear}` : ""} ${e.published}`
      if (problems.length) {
        console.log(`SKIP ${label} - ${problems.join(", ")}`)
        continue
      }
      const scope = (e.scope === "p4p" || e.scope === "big_board" ? e.scope : "weight") as "weight" | "p4p" | "big_board"
      const published = new Date(`${e.published}T12:00:00Z`)
      const editionClass = resolveEditionClassYear(scope, e.classYear ?? null, e.rows, published)
      const basis = resolveRankBasis(scope, e.rows)
      // SI's honorable mentions carry no rank; only ranked wrestlers make a "ranked" opponent.
      const rows = e.rows.filter((r) => r.rank != null && Number.isFinite(Number(r.rank)) && Number(r.rank) > 0 && String(r.name ?? "").trim()).map((r) => ({
        source: e.source,
        gender: e.gender,
        ranking_month: `${e.published.slice(0, 7)}-01`,
        scope,
        edition_class_year: editionClass,
        rank_basis: basis,
        rank: Number(r.rank),
        athlete_name: String(r.name).trim(),
        athlete_id: null,
        weight_class: r.weight ? String(r.weight).trim() : null,
        class_year: classYear(r.grade, published),
        high_school: r.school?.trim() || null,
        state: String(r.state ?? "").trim().toUpperCase() || null,
        source_url: e.url ?? null,
      }))
      const nc = rows.filter((r) => r.state === "NC").length
      if (!sb) {
        console.log(`${label}: ${rows.length} rows, ${nc} NC`)
        total += rows.length
        continue
      }
      const n = await archiveEdition(sb, rows, e.published, e.file)
      console.log(`${label}: archived ${n} of ${rows.length}${n < rows.length ? " - is the archive table created?" : ""}`)
      total += n
    }
    console.log(`\n${editions.length} editions, ${total} rows${WRITE ? " archived" : ". Dry run; --write stores them in the archive only."}`)
  })()
} else {

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
}
