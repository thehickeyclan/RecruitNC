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

  // Try athlete_name; when high_school is provided, only return rows that match school (avoid wrong-athlete / wrong-school data)
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
      // Only use rows that match this athlete's school; otherwise return none (avoid showing another school's data)
      rows = filtered
    }
    if (rows.length) return dedupeSuper32ByYear(mapSuper32Rows(rows))
  }

  // Do NOT fall back to high_school only — that showed other kids' Super32 (e.g. Adair Panama) on this athlete's profile. Only show rows that match this athlete's name.
  return []
}

/** One row per year (avoids duplicate 2024 entries from table/imports). */
function dedupeSuper32ByYear(rows: TournamentResultRow[]): TournamentResultRow[] {
  const byYear = new Map<number, TournamentResultRow>()
  for (const row of rows) {
    const y = typeof row.year === "number" ? row.year : parseInt(String(row.year), 10)
    if (!byYear.has(y)) byYear.set(y, row)
  }
  return Array.from(byYear.values()).sort((a, b) => (b.year as number) - (a.year as number))
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

/** NC United National Team result row (Ultimate Club Duals, NHSCA National Duals) */
export interface NationalTeamResultRow {
  event: string
  year: number
  record: string
}

/**
 * Fetch Ultimate Club Duals results from nc_united tables (Legacy NC data).
 * nc_united_tournament_results + nc_united_wrestlers + nc_united_tournaments.
 * Falls back gracefully if tables don't exist.
 */
export async function getUltimateClubDualsFromTables(
  supabase: SupabaseClient,
  athleteName: string,
  highSchool?: string
): Promise<NationalTeamResultRow[]> {
  if (!athleteName?.trim()) return []
  const nameTrim = athleteName.trim().toLowerCase()

  try {
    // Fetch tournament results with wrestler and tournament joined
    const { data: results, error } = await supabase
      .from("nc_united_tournament_results")
      .select("record, wins, losses, nc_united_wrestlers(first_name, last_name, high_school), nc_united_tournaments(name, year)")

    if (error) return []
    if (!results?.length) return []

    const rows: NationalTeamResultRow[] = []
    const seenYears = new Set<number>()
    for (const r of results as any[]) {
      const wrestler = r.nc_united_wrestlers
      const tournament = r.nc_united_tournaments
      if (!wrestler || !tournament) continue
      const tName = (tournament.name ?? "").toString()
      if (!tName.toLowerCase().includes("ultimate club duals")) continue
      const year = typeof tournament.year === "number" ? tournament.year : parseInt(String(tournament.year), 10)
      if (year !== 2024 && year !== 2025) continue
      const fullName = `${(wrestler.first_name ?? "").trim()} ${(wrestler.last_name ?? "").trim()}`.trim().toLowerCase()
      if (!fullName) continue
      if (!fullName.includes(nameTrim) && !nameTrim.includes(fullName) && !namesMatch(nameTrim, fullName)) continue
      if (highSchool?.trim() && wrestler.high_school) {
        const rowSchool = (wrestler.high_school ?? "").toString().toLowerCase()
        const athleteSchool = highSchool.trim().toLowerCase()
        if (rowSchool && athleteSchool && !rowSchool.includes(athleteSchool) && !athleteSchool.includes(rowSchool)) continue
      }
      if (seenYears.has(year)) continue
      seenYears.add(year)
      const record = (r.record ?? "").toString().trim()
      const derivedRecord = record || (r.wins != null || r.losses != null ? `${r.wins ?? 0}-${r.losses ?? 0}` : "")
      if (!derivedRecord) continue
      rows.push({ event: "Ultimate Club Duals", year, record: derivedRecord })
    }
    return rows.sort((a, b) => b.year - a.year)
  } catch {
    return []
  }
}

function namesMatch(a: string, b: string): boolean {
  const aParts = a.split(/\s+/).filter(Boolean)
  const bParts = b.split(/\s+/).filter(Boolean)
  if (!aParts.length || !bParts.length) return false
  const aFirst = aParts[0] ?? ""
  const aLast = aParts.slice(1).join(" ") || ""
  const bFirst = bParts[0] ?? ""
  const bLast = bParts.slice(1).join(" ") || ""
  return aFirst === bFirst && aLast === bLast
}
