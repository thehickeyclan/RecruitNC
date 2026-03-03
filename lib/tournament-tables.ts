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

/** Escape single quote for ILIKE (e.g. D'Ettore => D''Ettore) so the query doesn't break. */
function escapeForIlike(s: string): string {
  return (s ?? "").replace(/'/g, "''")
}

/** Return alternate spellings to try (e.g. Zach/Zack, D'Ettore/Dettore). Ensures we find tournament data even when DB spellings differ. */
function getNameVariants(name: string): string[] {
  const t = (name ?? "").trim()
  if (!t) return []
  const variants: string[] = [t]
  const noApostrophe = t.replace(/'/g, "").trim()
  if (noApostrophe && noApostrophe !== t) variants.push(noApostrophe)
  const lower = t.toLowerCase()
  if (lower.includes("zach ") && !lower.includes("zack ")) variants.push(t.replace(/\bZach\b/gi, "Zack"))
  if (lower.includes("zack ") && !lower.includes("zach ")) variants.push(t.replace(/\bZack\b/gi, "Zach"))
  if (lower.includes("ammon ") && !lower.includes("amon ")) variants.push(t.replace(/\bAmmon\b/gi, "Amon"))
  if (lower.includes("amon ") && !lower.includes("ammon ")) variants.push(t.replace(/\bAmon\b/gi, "Ammon"))
  return [...new Set(variants)]
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
  const namesToTry = getNameVariants(athleteName)

  for (const searchName of namesToTry) {
    const pattern = `%${escapeForIlike(searchName)}%`
    // 1. Try nhsca_placements (has record data per user)
    const { data: placements } = await supabase
      .from("nhsca_placements")
      .select("*")
      .ilike("athlete_name", pattern)
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
      .ilike("athlete_name", pattern)
      .gte("year", startYear)
      .lte("year", graduationYear)
      .order("year", { ascending: false })

    if (results?.length) {
      return results.map((r: any) => ({
        year: typeof r.year === "number" ? r.year : parseInt(String(r.year), 10) || new Date().getFullYear(),
        placement: formatPlacement(r.placement ?? r.place),
        record: (r.record ?? r.record_text ?? "").toString().trim(),
        weight: (r.weight ?? "").toString().trim(),
        division: (r.division ?? "").toString().trim(),
      }))
    }
  }

  return []
}

const ALL_TIME_YEAR_MIN = 2000
const ALL_TIME_YEAR_MAX = 2035

/**
 * Fetch NHSCA for all years (no grad-year window). Use for all-time stats (e.g. Blue page tiles).
 */
export async function getNHSCAFromTablesAllTime(
  supabase: SupabaseClient,
  athleteName: string
): Promise<TournamentResultRow[]> {
  if (!athleteName?.trim()) return []
  const namesToTry = getNameVariants(athleteName)

  for (const searchName of namesToTry) {
    const pattern = `%${escapeForIlike(searchName)}%`
    const { data: placements } = await supabase
      .from("nhsca_placements")
      .select("*")
      .ilike("athlete_name", pattern)
      .gte("year", ALL_TIME_YEAR_MIN)
      .lte("year", ALL_TIME_YEAR_MAX)
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

    const { data: results } = await supabase
      .from("wrestling_nhsca_results")
      .select("*")
      .ilike("athlete_name", pattern)
      .gte("year", ALL_TIME_YEAR_MIN)
      .lte("year", ALL_TIME_YEAR_MAX)
      .order("year", { ascending: false })

    if (results?.length) {
      return results.map((r: any) => ({
        year: typeof r.year === "number" ? r.year : parseInt(String(r.year), 10) || new Date().getFullYear(),
        placement: formatPlacement(r.placement ?? r.place),
        record: (r.record ?? r.record_text ?? "").toString().trim(),
        weight: (r.weight ?? "").toString().trim(),
        division: (r.division ?? "").toString().trim(),
      }))
    }
  }

  return []
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

  for (const searchName of getNameVariants(athleteName)) {
    const namePattern = `%${escapeForIlike(searchName)}%`
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
        // Allow rows with null/empty school (e.g. not resolved during import)
        return !rowSchool || rowSchool.includes(school) || school.includes(rowSchool)
      })
      rows = filtered.length > 0 ? filtered : rows
    }
    if (rows.length) return dedupeSuper32ByYear(mapSuper32Rows(rows))
  }

  return []
}

/**
 * Fetch Super32 for all years (no grad-year window). Use for all-time stats (e.g. Blue page tiles).
 */
export async function getSuper32FromTableAllTime(
  supabase: SupabaseClient,
  athleteName: string,
  options?: { highSchool?: string }
): Promise<TournamentResultRow[]> {
  if (!athleteName?.trim() && !options?.highSchool?.trim()) return []

  for (const searchName of getNameVariants(athleteName)) {
    const namePattern = `%${escapeForIlike(searchName)}%`
    const { data: byName } = await supabase
      .from("super32_results")
      .select("*")
      .ilike("athlete_name", namePattern)
      .gte("year", ALL_TIME_YEAR_MIN)
      .lte("year", ALL_TIME_YEAR_MAX)
      .order("year", { ascending: false })

    let rows = byName ?? []
    if (options?.highSchool?.trim() && rows.length > 0) {
      const school = options.highSchool.trim().toLowerCase()
      const filtered = rows.filter((r: any) => {
        const rowSchool = (r.high_school ?? r.school ?? "").toString().toLowerCase()
        return !rowSchool || rowSchool.includes(school) || school.includes(rowSchool)
      })
      rows = filtered.length > 0 ? filtered : rows
    }
    if (rows.length) return dedupeSuper32ByYear(mapSuper32Rows(rows))
  }

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
 * NC United National Team event: Ultimate Club Duals or NHSCA National Duals.
 * NHSCA: match "NHSCA Duals", "NHSCA National Duals", "NHSCA Dual", "NHSCA Dual Meet", etc.
 */
function isNationalTeamEvent(tournamentName: string): { event: string } | null {
  const t = tournamentName.toLowerCase()
  if (t.includes("ultimate club duals")) return { event: "Ultimate Club Duals" }
  if (t.includes("nhsca") && (t.includes("national duals") || t.includes("duals") || t.includes("dual"))) return { event: "NHSCA National Duals" }
  return null
}

/**
 * Fetch NC United National Team results (Ultimate Club Duals, NHSCA National Duals) from nc_united tables.
 * Schema: scripts/155-create-nc-united-national-team-schema.sql
 * Data: 156-insert-nhsca-2025-data.sql, 157-insert-ucd-2024-data.sql, 158-insert-ucd-2025-data.sql
 * Tables: nc_united_tournament_results + nc_united_wrestlers + nc_united_tournaments.
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
    // Relation names in Supabase are usually the referenced table name; some schemas use FK name (wrestler, tournament).
    let data: any[] | null = null
    const q1 = await supabase
      .from("nc_united_tournament_results")
      .select("record, wins, losses, nc_united_wrestlers(first_name, last_name, high_school), nc_united_tournaments(name, year)")
      .limit(2000)
    if (!q1.error && q1.data?.length !== undefined) {
      data = q1.data as any[]
    }
    if (!data?.length && (q1.error?.code === "42703" || q1.error?.message?.includes("relation"))) {
      const q2 = await supabase
        .from("nc_united_tournament_results")
        .select("record, wins, losses, wrestler(first_name, last_name, high_school), tournament(name, year)")
        .limit(2000)
      if (!q2.error && q2.data) data = q2.data as any[]
    }
    if (!data?.length) return []
    return buildNationalTeamRows(data, nameTrim, highSchool ?? "")
  } catch {
    return []
  }
}

function buildNationalTeamRows(
  results: any[],
  nameTrim: string,
  highSchool: string
): NationalTeamResultRow[] {
  const rows: NationalTeamResultRow[] = []
  const seenKeys = new Set<string>()
  for (const r of results) {
    const wrestler = r.nc_united_wrestlers ?? r.wrestler
    const tournament = r.nc_united_tournaments ?? r.tournament
    if (!wrestler || !tournament) continue
    const tName = (tournament.name ?? "").toString()
    const eventInfo = isNationalTeamEvent(tName)
    if (!eventInfo) continue
    const year = typeof tournament.year === "number" ? tournament.year : parseInt(String(tournament.year), 10)
    if (year < 2023 || year > 2026) continue
    const f = (wrestler.first_name ?? wrestler.firstname ?? "").toString().trim()
    const l = (wrestler.last_name ?? wrestler.lastname ?? "").toString().trim()
    const fullName = `${f} ${l}`.trim().toLowerCase()
    if (!fullName) continue
    if (!fullName.includes(nameTrim) && !nameTrim.includes(fullName) && !namesMatch(nameTrim, fullName)) continue
    const rowSchool = (wrestler.high_school ?? wrestler.highschool ?? "").toString().trim().toLowerCase()
    const athleteSchool = highSchool.trim().toLowerCase()
    if (rowSchool && athleteSchool && !rowSchool.includes(athleteSchool) && !athleteSchool.includes(rowSchool)) continue
    const yearKey = `${eventInfo.event}|${year}`
    if (seenKeys.has(yearKey)) continue
    seenKeys.add(yearKey)
    const record = (r.record ?? "").toString().trim()
    const derivedRecord = record || (r.wins != null || r.losses != null ? `${r.wins ?? 0}-${r.losses ?? 0}` : "")
    if (!derivedRecord) continue
    rows.push({ event: eventInfo.event, year, record: derivedRecord })
  }
  return rows.sort((a, b) => b.year - a.year)
}

function namesMatch(a: string, b: string): boolean {
  const aParts = a.split(/\s+/).filter(Boolean)
  const bParts = b.split(/\s+/).filter(Boolean)
  if (!aParts.length || !bParts.length) return false
  const aFirst = aParts[0] ?? ""
  const aLast = aParts.slice(1).join(" ") || ""
  const bFirst = bParts[0] ?? ""
  const bLast = bParts.slice(1).join(" ") || ""
  return aFirst.toLowerCase() === bFirst.toLowerCase() && aLast.toLowerCase() === bLast.toLowerCase()
}
