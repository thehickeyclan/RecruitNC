/**
 * Fetch NHSCA and Super32 from the actual database tables.
 * Source of truth: nhsca_placements, super32_results (and wrestling_nhsca_results).
 * No more copying data into athlete rows – read from where it lives.
 */

import type { SupabaseClient } from "@supabase/supabase-js"

export interface TournamentResultRow {
  year: number
  placement: string
  record: string
  weight?: string
  division?: string
}

function formatPlacement(p: number | string | null | undefined): string {
  if (p == null || p === "") return ""
  const n = typeof p === "number" ? p : parseInt(String(p), 10)
  if (isNaN(n)) return String(p)
  if (n === 1) return "Champion"
  if (n === 2) return "2nd All-American"
  if (n === 3) return "3rd All-American"
  if (n <= 8) return `${n}th All-American`
  return `${n}th Place`
}

/**
 * Fetch NHSCA from nhsca_placements (primary) or wrestling_nhsca_results (fallback).
 */
export async function getNHSCAFromTables(
  supabase: SupabaseClient,
  athleteName: string,
  graduationYear: number
): Promise<TournamentResultRow[]> {
  if (!athleteName?.trim() || !graduationYear || isNaN(graduationYear)) return []
  const startYear = graduationYear - 4

  // 1. Try nhsca_placements (has record data per user)
  const { data: placements } = await supabase
    .from("nhsca_placements")
    .select("*")
    .ilike("athlete_name", `%${athleteName.trim()}%`)
    .gte("year", startYear)
    .lte("year", graduationYear)
    .order("year", { ascending: false })

  if (placements?.length) {
    return placements.map((p: any) => ({
      year: typeof p.year === "number" ? p.year : parseInt(String(p.year), 10) || new Date().getFullYear(),
      placement: formatPlacement(p.placement),
      record: (p.record ?? "").toString().trim(),
      weight: (p.weight_class ?? p.weight ?? "").toString().trim(),
      division: (p.division ?? "").toString().trim(),
    }))
  }

  // 2. Fallback: wrestling_nhsca_results
  const { data: results } = await supabase
    .from("wrestling_nhsca_results")
    .select("*")
    .ilike("athlete_name", `%${athleteName.trim()}%`)
    .gte("year", startYear)
    .lte("year", graduationYear)
    .order("year", { ascending: false })

  if (!results?.length) return []

  return results.map((r: any) => ({
    year: typeof r.year === "number" ? r.year : parseInt(String(r.year), 10) || new Date().getFullYear(),
    placement: formatPlacement(r.placement ?? r.place),
    record: (r.record ?? r.record_text ?? "").toString().trim(),
    weight: (r.weight ?? "").toString().trim(),
    division: (r.division ?? "").toString().trim(),
  }))
}

/**
 * Fetch Super32 from super32_results table.
 * Table has: uuid, wins, losses, record, high_school (and athlete_name, year if present).
 */
export async function getSuper32FromTable(
  supabase: SupabaseClient,
  athleteName: string,
  graduationYear: number,
  options?: { highSchool?: string }
): Promise<TournamentResultRow[]> {
  if ((!athleteName?.trim() && !options?.highSchool?.trim()) || !graduationYear || isNaN(graduationYear)) return []
  const startYear = graduationYear - 4

  // Try athlete_name; filter by high_school when multiple athletes share similar names (e.g. Connor Reece vs Connor Reese)
  if (athleteName?.trim()) {
    const namePattern = `%${athleteName.trim()}%`
    const { data: byName } = await supabase
      .from("super32_results")
      .select("*")
      .ilike("athlete_name", namePattern)
      .gte("year", startYear)
      .lte("year", graduationYear)
      .order("year", { ascending: false })

    let rows = byName ?? []
    if (options?.highSchool?.trim() && rows.length > 0) {
      const school = options.highSchool.trim().toLowerCase()
      const filtered = rows.filter((r: any) => {
        const rowSchool = (r.high_school ?? r.school ?? "").toString().toLowerCase()
        return rowSchool.includes(school) || school.includes(rowSchool)
      })
      if (filtered.length > 0) rows = filtered
    }
    if (rows.length) return mapSuper32Rows(rows)
  }

  // Fallback: match by high_school only
  if (options?.highSchool?.trim()) {
    const { data: bySchool } = await supabase
      .from("super32_results")
      .select("*")
      .ilike("high_school", `%${options.highSchool.trim()}%`)
      .gte("year", startYear)
      .lte("year", graduationYear)
      .order("year", { ascending: false })

    if (bySchool?.length) return mapSuper32Rows(bySchool)
  }

  return []
}

function mapSuper32Rows(rows: any[]): TournamentResultRow[] {
  return rows.map((r: any) => {
    const record = (r.record ?? "").toString().trim()
    const derivedRecord = !record && (r.wins != null || r.losses != null)
      ? `${r.wins ?? 0}-${r.losses ?? 0}`
      : record
    return {
      year: typeof r.year === "number" ? r.year : parseInt(String(r.year), 10) || new Date().getFullYear(),
      placement: formatPlacement(r.placement ?? r.place),
      record: derivedRecord,
      weight: (r.weight ?? r.weight_class ?? "").toString().trim(),
    }
  })
}
