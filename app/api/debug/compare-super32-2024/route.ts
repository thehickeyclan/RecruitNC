/**
 * Compare Super 32 2024: CSV file (scripts/super32-nc-records-2024.csv) vs super32_results table.
 * GET returns a diff report: onlyInCsv, onlyInDb, matched, fieldDifferences.
 */

import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getCachedAdminCheck } from "@/lib/cached-auth-check"
import { readFileSync } from "fs"
import { join } from "path"

const CSV_PATH = join(process.cwd(), "scripts", "super32-nc-records-2024.csv")
const YEAR = 2024

type CsvRow = {
  year: number
  athlete_name: string
  weight_class: string
  wins: number
  losses: number
  record: string
  city_from_source: string
}

function normalizeName(name: string): string {
  return (name ?? "").toString().trim().toLowerCase().replace(/\s+/g, " ")
}

function normalizeWeight(w: unknown): string {
  if (w == null) return ""
  const s = String(w).trim()
  const n = Number(s)
  return Number.isFinite(n) ? String(n) : s
}

function parseCsv(path: string): CsvRow[] {
  const raw = readFileSync(path, "utf-8")
  const lines = raw.split(/\r?\n/).filter((line) => line.trim())
  if (lines.length < 2) return []
  const header = lines[0].toLowerCase().split(",").map((h) => h.trim())
  const rows: CsvRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim())
    const row: Record<string, string> = {}
    header.forEach((h, j) => {
      row[h] = values[j] ?? ""
    })
    const year = parseInt(row.year ?? "", 10)
    const wins = parseInt(row.wins ?? "", 10)
    const losses = parseInt(row.losses ?? "", 10)
    if (Number.isNaN(year) || row.athlete_name === "") continue
    rows.push({
      year,
      athlete_name: row.athlete_name ?? "",
      weight_class: normalizeWeight(row.weight_class ?? ""),
      wins: Number.isNaN(wins) ? 0 : wins,
      losses: Number.isNaN(losses) ? 0 : losses,
      record: row.record ?? "",
      city_from_source: row.city_from_source ?? "",
    })
  }
  return rows
}

export async function GET() {
  try {
    const admin = await getCachedAdminCheck()
    if (!admin.isAdmin) {
      return admin.response ?? NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const csvRows = parseCsv(CSV_PATH)
    const supabase = createAdminClient()
    const { data: dbRows, error } = await supabase
      .from("super32_results")
      .select("athlete_name, year, weight_class, wins, losses, record, high_school, school")
      .eq("year", YEAR)
      .order("athlete_name", { ascending: true })

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch super32_results", details: error.message },
        { status: 500 }
      )
    }

    const dbList = (dbRows ?? []).map((r: any) => ({
      athlete_name: (r.athlete_name ?? "").toString().trim(),
      weight_class: normalizeWeight(r.weight_class ?? ""),
      wins: r.wins != null ? Number(r.wins) : null,
      losses: r.losses != null ? Number(r.losses) : null,
      record: (r.record ?? "").toString().trim(),
      high_school: (r.high_school ?? r.school ?? "").toString().trim(),
    }))

    const key = (name: string, weight: string) => `${normalizeName(name)}|${weight}`

    const csvByKey = new Map<string, CsvRow>()
    csvRows.forEach((row) => {
      csvByKey.set(key(row.athlete_name, row.weight_class), row)
    })

    const dbByKey = new Map<string, typeof dbList[0]>()
    dbList.forEach((row) => {
      const k = key(row.athlete_name, row.weight_class)
      if (!dbByKey.has(k)) dbByKey.set(k, row)
    })

    const onlyInCsv: CsvRow[] = []
    const onlyInDb: typeof dbList = []
    const matched: { csv: CsvRow; db: typeof dbList[0] }[] = []
    const fieldDifferences: {
      athlete_name: string
      weight_class: string
      field: string
      csv: unknown
      db: unknown
    }[] = []

    csvRows.forEach((c) => {
      const k = key(c.athlete_name, c.weight_class)
      const d = dbByKey.get(k)
      if (!d) {
        onlyInCsv.push(c)
      } else {
        matched.push({ csv: c, db: d })
        if (c.record !== d.record) {
          fieldDifferences.push({ athlete_name: c.athlete_name, weight_class: c.weight_class, field: "record", csv: c.record, db: d.record })
        }
        if (c.wins !== d.wins) {
          fieldDifferences.push({ athlete_name: c.athlete_name, weight_class: c.weight_class, field: "wins", csv: c.wins, db: d.wins })
        }
        if (c.losses !== d.losses) {
          fieldDifferences.push({ athlete_name: c.athlete_name, weight_class: c.weight_class, field: "losses", csv: c.losses, db: d.losses })
        }
      }
    })

    dbList.forEach((d) => {
      const k = key(d.athlete_name, d.weight_class)
      if (!csvByKey.has(k)) onlyInDb.push(d)
    })

    return NextResponse.json({
      summary: {
        csvTotal: csvRows.length,
        dbTotal: dbList.length,
        onlyInCsvCount: onlyInCsv.length,
        onlyInDbCount: onlyInDb.length,
        matchedCount: matched.length,
        fieldDifferencesCount: fieldDifferences.length,
      },
      onlyInCsv: onlyInCsv.map((r) => ({
        athlete_name: r.athlete_name,
        weight_class: r.weight_class,
        record: r.record,
        wins: r.wins,
        losses: r.losses,
        city_from_source: r.city_from_source,
      })),
      onlyInDb: onlyInDb.map((r) => ({
        athlete_name: r.athlete_name,
        weight_class: r.weight_class,
        record: r.record,
        wins: r.wins,
        losses: r.losses,
        high_school: r.high_school,
      })),
      fieldDifferences,
      note: "Match key is athlete_name (normalized) + weight_class. CSV has city_from_source; DB has high_school (resolve from our data).",
    })
  } catch (err: any) {
    console.error("[compare-super32-2024]", err)
    return NextResponse.json(
      { error: "Comparison failed", details: err?.message ?? String(err) },
      { status: 500 }
    )
  }
}
