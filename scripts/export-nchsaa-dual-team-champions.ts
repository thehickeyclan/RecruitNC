#!/usr/bin/env npx tsx
/**
 * Export all-time NCHSAA dual team state champions by division.
 *
 * Usage:
 *   npx tsx scripts/export-nchsaa-dual-team-champions.ts
 *   npx tsx scripts/export-nchsaa-dual-team-champions.ts --csv
 *   npx tsx scripts/export-nchsaa-dual-team-champions.ts --out ./tmp/duals.json
 *
 * Source table: dual_team_champions
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { createClient } from "@supabase/supabase-js"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

function loadEnvFile(rel: string) {
  const p = path.join(root, rel)
  if (!fs.existsSync(p)) return
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const eq = t.indexOf("=")
    if (eq <= 0) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val.replace(/\r$/, "").trim()
  }
}

loadEnvFile(".env.local")
loadEnvFile(".env")

function trimEnv(s: string | undefined) {
  return (s ?? "").replace(/^\s+|\s+$/g, "").replace(/\r/g, "").trim()
}

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function parseArgs(argv: string[]) {
  let out = path.join(root, "scripts/data/nchsaa-dual-team-champions-all-time.json")
  let csv = false
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--csv") csv = true
    else if (a === "--out" && argv[i + 1]) out = path.resolve(root, argv[++i])
    else if (!a.startsWith("-")) out = path.resolve(root, a)
  }
  return { out, csv }
}

type Row = {
  year: number
  division: string | null
  champion_school: string | null
  runner_up_school: string | null
  champion_score: number | null
  runner_up_score: number | null
  is_vacated: boolean | null
  held: boolean | null
  notes: string | null
}

async function main() {
  const { out, csv } = parseArgs(process.argv.slice(2))
  const url = trimEnv(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL).replace(
    /\/+$/,
    "",
  )
  const key = trimEnv(
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY_OVERRIDE,
  )
  if (!url || !key) {
    console.error("Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    process.exit(1)
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const pageSize = 1000
  const rows: Row[] = []
  let from = 0
  for (;;) {
    const { data, error } = await supabase
      .from("dual_team_champions")
      .select(
        "year, division, champion_school, runner_up_school, champion_score, runner_up_score, is_vacated, held, notes",
      )
      .order("year", { ascending: true })
      .order("division", { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) {
      console.error("Query failed:", error.message)
      process.exit(1)
    }
    if (!data?.length) break
    for (const r of data) {
      rows.push({
        year: Number(r.year),
        division: r.division != null ? String(r.division) : null,
        champion_school: r.champion_school != null ? String(r.champion_school) : null,
        runner_up_school: r.runner_up_school != null ? String(r.runner_up_school) : null,
        champion_score: r.champion_score == null ? null : Number(r.champion_score),
        runner_up_score: r.runner_up_score == null ? null : Number(r.runner_up_score),
        is_vacated: r.is_vacated == null ? null : Boolean(r.is_vacated),
        held: r.held == null ? null : Boolean(r.held),
        notes: r.notes != null ? String(r.notes) : null,
      })
    }
    if (data.length < pageSize) break
    from += pageSize
  }

  rows.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    return (a.division ?? "").localeCompare(b.division ?? "")
  })

  // Group by division for GPT-friendly browsing
  const byDivision: Record<string, Row[]> = {}
  const titlesBySchool: Record<string, number> = {}
  for (const r of rows) {
    const d = r.division || "(null)"
    if (!byDivision[d]) byDivision[d] = []
    byDivision[d].push(r)
    if (r.champion_school && r.is_vacated !== true && r.held !== false) {
      titlesBySchool[r.champion_school] = (titlesBySchool[r.champion_school] ?? 0) + 1
    }
  }

  const mostTitles = Object.entries(titlesBySchool)
    .map(([school, title_count]) => ({ school, title_count }))
    .sort((a, b) => b.title_count - a.title_count || a.school.localeCompare(b.school))

  const payload = {
    schema_version: "1.0",
    dataset: "nchsaa_dual_team_champions_all_time",
    title: "NCHSAA dual team state champions — all time, by division",
    source_table: "dual_team_champions",
    exported_at: new Date().toISOString(),
    record_count: rows.length,
    divisions: Object.keys(byDivision).sort(),
    most_titles: mostTitles,
    by_division: byDivision,
    records: rows,
  }

  fs.mkdirSync(path.dirname(out), { recursive: true })

  if (csv) {
    const csvPath = out.endsWith(".csv") ? out : out.replace(/\.json$/i, "") + ".csv"
    const header = [
      "year",
      "division",
      "champion_school",
      "runner_up_school",
      "champion_score",
      "runner_up_score",
      "is_vacated",
      "held",
      "notes",
    ]
    const lines = [
      header.join(","),
      ...rows.map((r) =>
        [
          r.year,
          r.division,
          r.champion_school,
          r.runner_up_school,
          r.champion_score,
          r.runner_up_score,
          r.is_vacated,
          r.held,
          r.notes,
        ]
          .map(csvEscape)
          .join(","),
      ),
    ]
    fs.writeFileSync(csvPath, lines.join("\n"), "utf8")
    console.log(`Wrote ${rows.length} rows → ${csvPath}`)
  } else {
    fs.writeFileSync(out, JSON.stringify(payload, null, 2), "utf8")
    console.log(`Wrote ${rows.length} rows → ${out}`)
  }

  console.log(
    JSON.stringify(
      {
        record_count: rows.length,
        divisions: Object.keys(byDivision).length,
        top_schools: mostTitles.slice(0, 5),
      },
      null,
      2,
    ),
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
