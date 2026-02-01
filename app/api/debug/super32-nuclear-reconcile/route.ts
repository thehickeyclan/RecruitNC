/**
 * Nuclear reconcile: for a given year, DELETE all super32_results for that year,
 * then re-INSERT only from the verified CSV. Resolves high_school from athletes table.
 * Use this so the DB contains exactly what's in the CSV — no wrong "only in DB" rows.
 *
 * POST { "year": 2022 } | 2023 | 2024
 * Requires admin auth.
 */

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAdminAuth } from "@/lib/cached-auth-check"
import { readFileSync } from "fs"
import { join } from "path"

const ALLOWED_YEARS = [2022, 2023, 2024] as const

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
  try {
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
      if (Number.isNaN(year) || (row.athlete_name ?? "").trim() === "") continue
      rows.push({
        year,
        athlete_name: (row.athlete_name ?? "").trim(),
        weight_class: normalizeWeight(row.weight_class ?? ""),
        wins: Number.isNaN(wins) ? 0 : wins,
        losses: Number.isNaN(losses) ? 0 : losses,
        record: (row.record ?? "").trim(),
        city_from_source: (row.city_from_source ?? "").trim(),
      })
    }
    return rows
  } catch {
    return []
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await getAdminAuth()
    if (!user || !profile?.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const year = typeof body.year === "number" ? body.year : parseInt(String(body.year ?? ""), 10)
    if (!ALLOWED_YEARS.includes(year as (typeof ALLOWED_YEARS)[number])) {
      return NextResponse.json(
        { error: "Invalid year. Use 2022, 2023, 2024, or 2025." },
        { status: 400 }
      )
    }

    const csvPath = join(process.cwd(), "scripts", `super32-nc-records-${year}.csv`)
    const csvRows = parseCsv(csvPath)
    if (csvRows.length === 0) {
      return NextResponse.json(
        { error: `No rows in CSV for ${year}. Check scripts/super32-nc-records-${year}.csv` },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // 1. Delete all super32_results for this year
    const { error: deleteError } = await supabase
      .from("super32_results")
      .delete()
      .eq("year", year)

    if (deleteError) {
      console.error("[super32-nuclear-reconcile] delete error:", deleteError)
      return NextResponse.json(
        { error: "Failed to delete existing rows", details: deleteError.message },
        { status: 500 }
      )
    }

    // 2. Resolve high_school from athletes (name -> highschool)
    const { data: athletes, error: athletesError } = await supabase
      .from("athletes")
      .select("name, highschool")

    if (athletesError) {
      console.error("[super32-nuclear-reconcile] athletes fetch error:", athletesError)
      return NextResponse.json(
        { error: "Failed to fetch athletes", details: athletesError.message },
        { status: 500 }
      )
    }

    const athleteList = (athletes ?? []).filter((a) => a.name != null) as { name: string; highschool: string | null }[]
    const nameToSchool = new Map<string, string>()
    athleteList.forEach((a) => {
      const key = normalizeName(a.name)
      if (!nameToSchool.has(key)) nameToSchool.set(key, (a.highschool ?? "").trim() || "")
    })

    function resolveHighSchool(csvName: string): string | null {
      const key = normalizeName(csvName)
      const exact = nameToSchool.get(key)
      if (exact) return exact || null
      for (const [athleteKey, highschool] of nameToSchool) {
        if (athleteKey.includes(key) || key.includes(athleteKey)) return highschool || null
      }
      return null
    }

    // 3. Build insert rows
    const insertRows = csvRows.map((r) => ({
      year: r.year,
      athlete_name: r.athlete_name,
      weight_class: r.weight_class,
      wins: r.wins,
      losses: r.losses,
      record: r.record,
      high_school: resolveHighSchool(r.athlete_name),
    }))

    // 4. Insert in batches of 50
    const BATCH = 50
    let inserted = 0
    for (let i = 0; i < insertRows.length; i += BATCH) {
      const batch = insertRows.slice(i, i + BATCH)
      const { error: insertError } = await supabase.from("super32_results").insert(batch)
      if (insertError) {
        console.error("[super32-nuclear-reconcile] insert error:", insertError)
        return NextResponse.json(
          {
            error: "Insert failed after deleting",
            details: insertError.message,
            deleted: true,
            insertedSoFar: inserted,
          },
          { status: 500 }
        )
      }
      inserted += batch.length
    }

    return NextResponse.json({
      success: true,
      year,
      deleted: true,
      inserted,
      message: `Super32 ${year}: deleted all existing rows, re-inserted ${inserted} from CSV. DB now matches verified list only.`,
    })
  } catch (err: unknown) {
    console.error("[super32-nuclear-reconcile]", err)
    return NextResponse.json(
      { error: "Nuclear reconcile failed", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
