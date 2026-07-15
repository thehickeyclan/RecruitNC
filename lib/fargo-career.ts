/**
 * Derived Fargo career stats — FS and GR are separate careers plus a combined total.
 * Pure helpers for Data Dawg / leaderboards; do not invent rows.
 */

import { parseFargoStyle, type FargoStyle } from "@/lib/fargo-division"

export type FargoSeasonRowLike = {
  year?: number | null
  style?: string | null
  division?: string | null
  is_all_american?: boolean | null
  placement?: number | null
  wins?: number | null
  losses?: number | null
}

export type FargoCareerSlice = {
  appearances: number
  wins: number
  losses: number
  record: string
  allAmericans: number
  champions: number
  finalists: number
  bestPlacement: number | null
}

export type FargoCareerBreakdown = {
  freestyle: FargoCareerSlice
  greco: FargoCareerSlice
  combined: FargoCareerSlice
}

function emptySlice(): FargoCareerSlice {
  return {
    appearances: 0,
    wins: 0,
    losses: 0,
    record: "0-0",
    allAmericans: 0,
    champions: 0,
    finalists: 0,
    bestPlacement: null,
  }
}

function rowStyle(row: FargoSeasonRowLike): FargoStyle {
  if (row.style) return parseFargoStyle(row.style)
  return parseFargoStyle(row.division)
}

function accumulate(slice: FargoCareerSlice, row: FargoSeasonRowLike): void {
  slice.appearances += 1
  const w = Number(row.wins)
  const l = Number(row.losses)
  if (Number.isFinite(w)) slice.wins += w
  if (Number.isFinite(l)) slice.losses += l
  const aa =
    Boolean(row.is_all_american) ||
    (row.placement != null && Number(row.placement) >= 1 && Number(row.placement) <= 8)
  if (aa) slice.allAmericans += 1
  const place = row.placement != null ? Number(row.placement) : null
  if (place === 1) slice.champions += 1
  if (place === 1 || place === 2) slice.finalists += 1
  if (place != null && Number.isFinite(place)) {
    if (slice.bestPlacement == null || place < slice.bestPlacement) {
      slice.bestPlacement = place
    }
  }
}

function finalize(slice: FargoCareerSlice): FargoCareerSlice {
  return {
    ...slice,
    record: `${slice.wins}-${slice.losses}`,
  }
}

/** Build Freestyle / Greco / combined career from season aggregate rows. */
export function summarizeFargoCareer(rows: FargoSeasonRowLike[]): FargoCareerBreakdown {
  const freestyle = emptySlice()
  const greco = emptySlice()
  const combined = emptySlice()

  for (const row of rows) {
    const style = rowStyle(row)
    accumulate(combined, row)
    if (style === "GR") accumulate(greco, row)
    else accumulate(freestyle, row)
  }

  return {
    freestyle: finalize(freestyle),
    greco: finalize(greco),
    combined: finalize(combined),
  }
}

export function formatFargoCareerAnswerLines(
  athleteName: string,
  career: FargoCareerBreakdown,
): string[] {
  const lines = [
    `${athleteName} Fargo career (style-split):`,
    `Combined: ${career.combined.allAmericans}× All-American · ${career.combined.record} · ${career.combined.appearances} appearances`,
    `Freestyle: ${career.freestyle.allAmericans}× All-American · ${career.freestyle.record}`,
    `Greco-Roman: ${career.greco.allAmericans}× All-American · ${career.greco.record}`,
  ]
  if (career.combined.champions) {
    lines.push(`Champions: ${career.combined.champions} (FS ${career.freestyle.champions} / GR ${career.greco.champions})`)
  }
  return lines
}
