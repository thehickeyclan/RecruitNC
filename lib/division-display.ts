/**
 * Division display: single place for full vs abbreviated labels.
 * - Full: spell out NCAA, Roman numerals (I, II, III). Use when space allows.
 * - Short: NCAA D-I, NCAA D-II, etc. Use on cards, filters, tables.
 * Do not mix "D1" with "Division I" — use these helpers everywhere.
 */

/** Full labels (spell out NCAA, Roman numerals I, II, III). */
export const DIVISION_FULL = {
  D1: "NCAA Division I",
  D2: "NCAA Division II",
  D3: "NCAA Division III",
  NAIA: "NAIA",
  NJCAA: "NJCAA",
  CLUB: "Club (NCWA)",
} as const

/** Abbreviated labels for cards, filters, tables. */
export const DIVISION_SHORT = {
  D1: "NCAA D-I",
  D2: "NCAA D-II",
  D3: "NCAA D-III",
  NAIA: "NAIA",
  NJCAA: "NJCAA",
  CLUB: "Club (NCWA)",
} as const

export const CANONICAL_DIVISIONS_FULL = [
  DIVISION_FULL.D1,
  DIVISION_FULL.D2,
  DIVISION_FULL.D3,
  DIVISION_FULL.NAIA,
  DIVISION_FULL.NJCAA,
  DIVISION_FULL.CLUB,
] as const

export type CanonicalDivisionFull = (typeof CANONICAL_DIVISIONS_FULL)[number]

const FULL_TO_SHORT: Record<string, string> = {
  [DIVISION_FULL.D1]: DIVISION_SHORT.D1,
  [DIVISION_FULL.D2]: DIVISION_SHORT.D2,
  [DIVISION_FULL.D3]: DIVISION_SHORT.D3,
  [DIVISION_FULL.NAIA]: DIVISION_SHORT.NAIA,
  [DIVISION_FULL.NJCAA]: DIVISION_SHORT.NJCAA,
  [DIVISION_FULL.CLUB]: DIVISION_SHORT.CLUB,
}

/** Normalize input to full form for lookup. */
function normalizeToFull(division: string): string {
  const d = division.toLowerCase().trim()
  if (d.includes("division i") || d.includes("division 1") || d === "di" || d === "d1" || d.includes("d-i")) return DIVISION_FULL.D1
  if (d.includes("division ii") || d.includes("division 2") || d === "dii" || d === "d2" || d.includes("d-ii")) return DIVISION_FULL.D2
  if (d.includes("division iii") || d.includes("division 3") || d === "diii" || d === "d3" || d.includes("d-iii")) return DIVISION_FULL.D3
  if (d.includes("naia")) return DIVISION_FULL.NAIA
  if (d.includes("njcaa") || d.includes("juco")) return DIVISION_FULL.NJCAA
  if (d.includes("club") || d.includes("ncwa")) return DIVISION_FULL.CLUB
  return division
}

/**
 * Return the full label (NCAA Division I, etc.) for display when space allows.
 */
export function getDivisionDisplayFull(division: string | null | undefined): string {
  if (!division?.trim()) return "—"
  const full = normalizeToFull(division)
  return CANONICAL_DIVISIONS_FULL.includes(full as CanonicalDivisionFull) ? full : division
}

/**
 * Return the abbreviated label (NCAA D-I, etc.) for cards, filters, tables.
 */
export function getDivisionDisplayShort(division: string | null | undefined): string {
  if (!division?.trim()) return "—"
  const full = normalizeToFull(division)
  return FULL_TO_SHORT[full] ?? full
}
