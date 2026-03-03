/**
 * One-time (or post-import) script: standardize athlete names across tournament tables.
 * - Apostrophes: curly/smart → straight
 * - Known same-person spellings → one canonical (e.g. Jackson Dettore / D'Ettore → "Jackson D'Ettore")
 *
 * Run: POST /api/admin/standardize-tournament-names (admin only)
 * Then lookups can use a single name and don't need alias lists at query time.
 */

import { getAdminAuth } from "@/lib/cached-auth-check"
import { standardizeName } from "@/lib/standardize-tournament-names"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

type TableConfig = {
  table: string
  nameColumn: string
}

const TABLES: TableConfig[] = [
  { table: "wrestling_nchsaa_results", nameColumn: "wrestler_name" },
  { table: "nhsca_placements", nameColumn: "athlete_name" },
  { table: "wrestling_nhsca_results", nameColumn: "athlete_name" },
  { table: "super32_results", nameColumn: "athlete_name" },
]

export async function POST() {
  const { user, profile } = await getAdminAuth()
  if (!user || !profile?.is_admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createAdminClient()
  const results: Record<string, { updated: number; changes: { from: string; to: string; count: number }[] }> = {}

  for (const { table, nameColumn } of TABLES) {
    const changes: { from: string; to: string; count: number }[] = []
    let updated = 0

    const { data: rows, error: fetchError } = await supabase
      .from(table)
      .select(nameColumn)

    if (fetchError) {
      results[table] = { updated: 0, changes: [], error: String(fetchError.message) } as any
      continue
    }

    const distinctNames = [...new Set((rows ?? []).map((r: any) => (r[nameColumn] ?? "").toString().trim()).filter(Boolean))]

    for (const rawName of distinctNames) {
      const standardized = standardizeName(rawName)
      if (standardized === rawName) continue

      const { count: toUpdateCount } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true })
        .eq(nameColumn, rawName)
      const countNum = toUpdateCount ?? 0
      if (countNum === 0) continue

      const { error } = await supabase
        .from(table)
        .update({ [nameColumn]: standardized })
        .eq(nameColumn, rawName)

      if (error) {
        ;(results[table] as any) = results[table] ?? { updated: 0, changes: [] }
        ;(results[table] as any).error = String(error.message)
        break
      }
      updated += countNum
      changes.push({ from: rawName, to: standardized, count: countNum })
    }

    results[table] = { updated, changes }
  }

  const totalUpdated = Object.values(results).reduce((sum, r) => sum + (r.updated ?? 0), 0)
  return NextResponse.json({
    ok: true,
    totalUpdated,
    tables: results,
    message:
      totalUpdated > 0
        ? `Standardized ${totalUpdated} row(s). Names in DB now use straight apostrophes and canonical spellings.`
        : "No rows needed updates (names already standardized).",
  })
}
