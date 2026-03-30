/**
 * Single source of truth for public profile data (NHSCA, Super32, etc.)
 * Used by: public-rankings API (2026/2027/2028 pages), unified-profile page
 * All kids and graduates get the same public profile - one code path.
 */

import type { TournamentResultRow } from "@/lib/tournament-tables"
import { getNhscaResults, getSuper32Results, type TournamentResult } from "@/lib/tournament-utils"

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

/**
 * Merge NHSCA from placement tables (name lookup) with athlete row (nhsca_results JSON + legacy columns).
 * Prefer table row when both have the same year and the table row has data.
 */
export function mergeNhscaForPublicRankings(
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
    if (!existing || isDisplayRowEmpty(existing)) map.set(r.year, r)
  }
  return [...map.values()].sort((a, b) => b.year - a.year)
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
