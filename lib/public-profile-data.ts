/**
 * Single source of truth for public profile data (NHSCA, Super32, etc.)
 * Used by: public-rankings API (2026/2027/2028 pages), unified-profile page, prospects list, admin simple ranking
 * All kids and graduates get the same public profile - one code path.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { recruitNcDebugLogNhsca } from "@/lib/recruitnc-debug"
import {
  dedupeNhscaByYearForGradYear,
  getNHSCAFromTables,
  getNHSCAFromTablesAllTime,
  getSuper32FromTable,
  getFargoFromTable,
  type TournamentResultRow,
} from "@/lib/tournament-tables"
import {
  getNhscaResults,
  getSuper32Results,
  nhscaDisplayPlacement,
  type TournamentResult,
} from "@/lib/tournament-utils"

export interface TournamentResultForDisplay {
  year: number
  placement: string
  record: string
  weight?: string
  division?: string
}

export interface PublicProfileTournamentData {
  nhscaResults: TournamentResultForDisplay[]
  super32Results: TournamentResultForDisplay[]
}

function formatNhscaPlacementForPublicDisplay(raw: string): string {
  const s = (raw ?? "").trim()
  if (!s) return ""
  const lower = s.toLowerCase()
  if (lower === "champion" || lower === "1st") return "Champion"
  if (lower === "finalist") return "2nd All-American"
  const ord = s.match(/^(\d+)(st|nd|rd|th)$/i)
  if (ord) {
    const n = parseInt(ord[1], 10)
    if (n === 1) return "Champion"
    if (n === 2) return "2nd All-American"
    if (n === 3) return "3rd All-American"
    if (n >= 4 && n <= 8) return `${n}th All-American`
    return `${n}th Place`
  }
  if (/^\d+$/.test(s)) {
    const n = parseInt(s, 10)
    if (n === 1) return "Champion"
    if (n === 2) return "2nd All-American"
    if (n === 3) return "3rd All-American"
    if (n >= 4 && n <= 8) return `${n}th All-American`
    return `${n}th Place`
  }
  return s
}

function formatSuper32PlacementForPublicDisplay(raw: string): string {
  const s = (raw ?? "").trim()
  if (!s) return ""
  const lower = s.toLowerCase()
  if (lower === "champion" || lower === "1st") return "Champion"
  const ord = s.match(/^(\d+)(st|nd|rd|th)$/i)
  if (ord) {
    const n = parseInt(ord[1], 10)
    if (n === 1) return "Champion"
    if (n === 2) return "2nd Place"
    if (n === 3) return "3rd Place"
    if (n > 3) return `${n}th Place`
  }
  if (/^\d+$/.test(s)) {
    const n = parseInt(s, 10)
    if (n === 1) return "Champion"
    if (n === 2) return "2nd Place"
    if (n === 3) return "3rd Place"
    return `${n}th Place`
  }
  return s
}

function tournamentRowToNhscaDisplay(r: TournamentResult): TournamentResultForDisplay | null {
  const record = (r.record ?? "").trim()
  const placement = formatNhscaPlacementForPublicDisplay(r.placement)
  if (!placement && !record) return null
  return {
    year: r.year,
    placement,
    record,
    weight: r.weight,
    division: r.division,
  }
}

function tournamentRowToSuper32Display(r: TournamentResult): TournamentResultForDisplay | null {
  const record = (r.record ?? "").trim()
  const placement = formatSuper32PlacementForPublicDisplay(r.placement)
  if (!placement && !record) return null
  return {
    year: r.year,
    placement,
    record,
    weight: r.weight,
    division: r.division,
  }
}

function isDisplayRowEmpty(r: TournamentResultForDisplay): boolean {
  return !(r.placement?.trim() || r.record?.trim())
}

/** Drop only exact duplicate rows (same name variant hit twice). Must NOT collapse same-year Senior+Junior — that needs dedupeNhscaByYearForGradYear. */
function uniqNhscaTableRows(rows: TournamentResultRow[]): TournamentResultRow[] {
  const seen = new Set<string>()
  const out: TournamentResultRow[] = []
  for (const r of rows) {
    const key = JSON.stringify([
      r.year,
      (r.placement ?? "").trim(),
      (r.record ?? "").trim(),
      (r.weight ?? "").trim(),
      (r.division ?? "").trim(),
    ])
    if (seen.has(key)) continue
    seen.add(key)
    out.push(r)
  }
  return out
}

/** Used by GET /api/athlete/[id] and merge — DB may expose graduationyear, graduationYear, or graduation_year. */
export function resolveGraduationYear(athlete: Record<string, unknown>): number {
  const raw =
    athlete.graduationyear ?? athlete.graduationYear ?? (athlete as { graduation_year?: unknown }).graduation_year
  const n = Number(raw)
  if (Number.isFinite(n) && n >= 2000 && n <= 2100) return n
  return new Date().getFullYear()
}

/** Real grad year on row for NHSCA Senior/Junior dedupe; undefined when missing/invalid (do not substitute current year). */
function gradYearForNhscaBracketDedupe(athlete: Record<string, unknown>): number | undefined {
  const raw =
    athlete.graduationyear ?? athlete.graduationYear ?? (athlete as { graduation_year?: unknown }).graduation_year
  const n = Number(raw)
  if (Number.isFinite(n) && n >= 1990 && n <= 2050) return Math.floor(n)
  return undefined
}

/**
 * Merge NHSCA from placement tables (name lookup) with athlete row (nhsca_results JSON + legacy columns).
 * Prefer table row when both have the same year and the table row has data.
 * `gradYearForBracket`: when set, disambiguates Senior vs Junior rows that share the same tournament year.
 */
export function mergeNhscaForPublicRankings(
  fromTables: TournamentResultRow[],
  fromProfile: TournamentResultForDisplay[],
  gradYearForBracket?: number,
): TournamentResultForDisplay[] {
  const tableRows =
    gradYearForBracket != null && Number.isFinite(gradYearForBracket)
      ? dedupeNhscaByYearForGradYear(fromTables, gradYearForBracket)
      : fromTables
  recruitNcDebugLogNhsca("mergeNhscaForPublicRankings", {
    fromTables: fromTables.length,
    afterBracketDedupe: tableRows.length,
    gradYearForBracket: gradYearForBracket ?? null,
    fromProfileRows: fromProfile.length,
  })
  const map = new Map<number, TournamentResultForDisplay>()
  for (const r of tableRows) {
    const row: TournamentResultForDisplay = {
      year: r.year,
      placement: (r.placement ?? "").trim(),
      record: (r.record ?? "").trim(),
      weight: r.weight,
      division: r.division,
    }
    if (!isDisplayRowEmpty(row)) map.set(r.year, row)
  }
  for (const r of fromProfile) {
    const existing = map.get(r.year)
    if (!existing || isDisplayRowEmpty(existing)) {
      map.set(r.year, r)
      continue
    }
    /** Bulk `nhsca_placements` sometimes has placement with no record (bad import). Prefer profile row when it has a real record and no/fewer bogus placement. */
    const tablePlacementOnly = Boolean(existing.placement?.trim()) && !existing.record?.trim()
    const profileHasRecord = Boolean(r.record?.trim())
    if (tablePlacementOnly && profileHasRecord) {
      const usePlacement = r.placement?.trim() ? r.placement : ""
      map.set(r.year, {
        ...existing,
        record: r.record,
        placement: usePlacement,
        weight: r.weight || existing.weight,
        division: r.division || existing.division,
      })
    }
  }
  const merged = [...map.values()]
    .sort((a, b) => b.year - a.year)
    .map((r) => {
      const surf = nhscaDisplayPlacement(r.placement, r.record)
      if (!surf) return r
      return { ...r, placement: surf }
    })
  recruitNcDebugLogNhsca("mergeNhscaForPublicRankings:result", {
    years: merged.map((r) => r.year),
    rowCount: merged.length,
  })
  return merged
}

/**
 * **The only NHSCA merge for an athlete:** `nhsca_roster` (live truth first) → `nhsca_placements` → `wrestling_nhsca_results` × name variants,
 * merged with `nhsca_results` JSON + legacy columns (any year). Do not reimplement table walks elsewhere.
 *
 * Pass a full `athletes` row when possible; for name-only lookups use `{ name, wrestling_name?, graduationyear }`.
 * `tablesAllTime`: load placement tables across all years (Data Dawg / alumni dossiers); merge still uses profile JSON + optional bracket dedupe when grad year is known.
 */
export async function getNHSCAForAthlete(
  supabase: SupabaseClient,
  athlete: Record<string, unknown>,
  options?: { tablesAllTime?: boolean },
): Promise<TournamentResultForDisplay[]> {
  const useAllTime = options?.tablesAllTime === true
  const gradYear = resolveGraduationYear(athlete)
  const bracketGrad = gradYearForNhscaBracketDedupe(athlete)
  const name = (athlete.name ?? "").toString().trim()
  const fromParts = [athlete.firstName, athlete.firstname, athlete.lastName, athlete.lastname]
    .filter(Boolean)
    .join(" ")
    .trim()
  const primaryName = name || fromParts
  const wrestlingName = (athlete.wrestling_name ?? "").toString().trim()
  /** One call per canonical name — getNHSCAFromTables already expands getNameVariants internally. Looping every variant caused dozens of sequential DB round-trips per profile (30s+). */
  const bases = new Set<string>()
  if (primaryName) bases.add(primaryName)
  if (wrestlingName && wrestlingName.toLowerCase() !== primaryName.toLowerCase()) bases.add(wrestlingName)
  const merged: Awaited<ReturnType<typeof getNHSCAFromTables>> = []
  for (const n of bases) {
    const rows = useAllTime
      ? await getNHSCAFromTablesAllTime(supabase, n, gradYear)
      : await getNHSCAFromTables(supabase, n, gradYear)
    merged.push(...rows)
  }
  const uniq = uniqNhscaTableRows(merged)
  uniq.sort((a, b) => (b.year as number) - (a.year as number))
  const fromRow = buildPublicProfileTournamentData(athlete)
  const mergeBracketYear = useAllTime ? bracketGrad ?? undefined : gradYear
  const out = mergeNhscaForPublicRankings(uniq, fromRow.nhscaResults, mergeBracketYear)
  const aid = athlete.id != null ? String(athlete.id).slice(0, 8) : "n/a"
  recruitNcDebugLogNhsca("getNHSCAForAthlete:done", {
    athleteIdPrefix: aid,
    gradYear,
    nameBaseCount: bases.size,
    rawTableRowsPushed: merged.length,
    afterUniq: uniq.length,
    fromProfileNhscaJsonRows: fromRow.nhscaResults.length,
    finalNhscaRows: out.length,
  })
  return out
}

/** @deprecated Use `getNHSCAForAthlete` — alias for search/replace compatibility. */
export const mergeNhscaForAthleteRecord = getNHSCAForAthlete

/**
 * Merge Super32 table rows with athlete row JSON + legacy columns (same year policy as NHSCA).
 */
export function mergeSuper32ForPublicRankings(
  fromTables: TournamentResultRow[],
  fromProfile: TournamentResultForDisplay[],
): TournamentResultForDisplay[] {
  const map = new Map<number, TournamentResultForDisplay>()
  for (const r of fromTables) {
    const row: TournamentResultForDisplay = {
      year: r.year,
      placement: (r.placement ?? "").trim(),
      record: (r.record ?? "").trim(),
      weight: r.weight,
      division: r.division,
    }
    if (!isDisplayRowEmpty(row)) map.set(r.year, row)
  }
  for (const r of fromProfile) {
    const existing = map.get(r.year)
    if (!existing || isDisplayRowEmpty(existing)) {
      map.set(r.year, r)
    }
  }
  return [...map.values()]
    .sort((a, b) => b.year - a.year)
    .map((r) => {
      const surf = formatSuper32PlacementForPublicDisplay(r.placement)
      if (!surf) return r
      return { ...r, placement: surf }
    })
}

/**
 * **The only Super32 merge for an athlete:** `super32_results` table × name variants,
 * merged with `super32_results` JSON + legacy columns on the athlete row.
 */
export async function getSuper32ForAthlete(
  supabase: SupabaseClient,
  athlete: Record<string, unknown>,
): Promise<TournamentResultForDisplay[]> {
  const gradYear = resolveGraduationYear(athlete)
  const highSchool = String(athlete.highschool ?? athlete.high_school ?? "").trim()
  const name = String(athlete.name ?? "").trim()
  const wrestlingName = String(athlete.wrestling_name ?? "").trim()
  const bases = new Set<string>()
  if (name) bases.add(name)
  if (wrestlingName && wrestlingName.toLowerCase() !== name.toLowerCase()) bases.add(wrestlingName)
  const merged: TournamentResultRow[] = []
  for (const n of bases) {
    const rows = await getSuper32FromTable(supabase, n, gradYear, { highSchool: highSchool || undefined })
    merged.push(...rows)
  }
  const uniq = uniqNhscaTableRows(merged)
  const fromRow = buildPublicProfileTournamentData(athlete).super32Results
  return mergeSuper32ForPublicRankings(uniq, fromRow)
}

function fargoTableRowsToDisplay(rows: TournamentResultRow[]): TournamentResultForDisplay[] {
  const byKey = new Map<string, TournamentResultForDisplay>()
  for (const r of rows) {
    const row: TournamentResultForDisplay = {
      year: r.year,
      placement: (r.placement ?? "").trim(),
      record: (r.record ?? "").trim(),
      weight: r.weight,
      division: r.division,
    }
    if (!row.placement && !row.record) continue
    const key = `${row.year}|${row.division ?? ""}|${row.weight ?? ""}`
    if (!byKey.has(key)) byKey.set(key, row)
  }
  return [...byKey.values()].sort((a, b) => b.year - a.year)
}

/** Fargo Nationals from `fargo_results` table (name variants + high school disambiguation). */
export async function getFargoForAthlete(
  supabase: SupabaseClient,
  athlete: Record<string, unknown>,
): Promise<TournamentResultForDisplay[]> {
  const gradYear = resolveGraduationYear(athlete)
  const highSchool = String(athlete.highschool ?? athlete.high_school ?? "").trim()
  const name = String(athlete.name ?? "").trim()
  const wrestlingName = String(athlete.wrestling_name ?? "").trim()
  const bases = new Set<string>()
  if (name) bases.add(name)
  if (wrestlingName && wrestlingName.toLowerCase() !== name.toLowerCase()) bases.add(wrestlingName)
  const merged: TournamentResultRow[] = []
  for (const n of bases) {
    const rows = await getFargoFromTable(supabase, n, gradYear, { highSchool: highSchool || undefined })
    merged.push(...rows)
  }
  return fargoTableRowsToDisplay(merged)
}

/**
 * Build NHSCA and Super32 results from athlete row - same logic as public-rankings API.
 * Uses nhsca_results / super32_results JSON first, then legacy year columns (incl. 2026).
 */
export function buildPublicProfileTournamentData(athlete: any): PublicProfileTournamentData {
  const nhscaResults = getNhscaResults(athlete)
    .map(tournamentRowToNhscaDisplay)
    .filter(Boolean) as TournamentResultForDisplay[]

  const super32Results = getSuper32Results(athlete)
    .map(tournamentRowToSuper32Display)
    .filter(Boolean) as TournamentResultForDisplay[]

  return { nhscaResults, super32Results }
}
