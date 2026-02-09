/**
 * Division display: single place for full vs abbreviated labels.
 * - Full: spell out NCAA, Roman numerals (I, II, III). Use when space allows.
 * - Short: DI, DII, DIII, NAIA, NJCAA. Use on cards, filters, tables.
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
  D1: "DI",
  D2: "DII",
  D3: "DIII",
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
 * Normalize any division string to the canonical full form (for dropdown value / DB consistency).
 * Returns "" if input is empty or not recognized.
 */
export function normalizeToCanonicalFull(division: string | null | undefined): string {
  if (!division?.trim()) return ""
  const full = normalizeToFull(division)
  return CANONICAL_DIVISIONS_FULL.includes(full as CanonicalDivisionFull) ? full : ""
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
 * Return the abbreviated label (DI, DII, DIII, etc.) for cards, filters, tables.
 */
export function getDivisionDisplayShort(division: string | null | undefined): string {
  if (!division?.trim()) return "—"
  const full = normalizeToFull(division)
  return FULL_TO_SHORT[full] ?? full
}

/**
 * Whether an athlete's division matches a filter value. Use for all client-side division filtering.
 * filterValue should be "all" or a canonical full division (e.g. "NCAA Division I").
 * Normalizes athleteDivision so "D1", "DI", "NCAA Division I" all match the same filter.
 */
export function matchesDivisionFilter(
  athleteDivision: string | null | undefined,
  filterValue: string
): boolean {
  if (!filterValue || filterValue === "all") return true
  if (!athleteDivision?.trim()) return false
  const canonical = normalizeToCanonicalFull(athleteDivision)
  if (!canonical) return false
  return canonical === filterValue
}

/** Common DB/API values that map to each canonical division (for .in() queries so legacy data still matches). */
const DIVISION_QUERY_ALIASES: Record<string, string[]> = {
  [DIVISION_FULL.D1]: ["NCAA Division I", "Division I", "D1", "DI", "NCAA DI", "Division 1", "NCAA Division 1"],
  [DIVISION_FULL.D2]: ["NCAA Division II", "Division II", "D2", "DII", "NCAA DII", "Division 2", "NCAA Division 2"],
  [DIVISION_FULL.D3]: ["NCAA Division III", "Division III", "D3", "DIII", "NCAA DIII", "Division 3", "NCAA Division 3"],
  [DIVISION_FULL.NAIA]: ["NAIA"],
  [DIVISION_FULL.NJCAA]: ["NJCAA", "JUCO", "Junior College"],
  [DIVISION_FULL.CLUB]: ["Club (NCWA)", "Club", "NCWA"],
}

/**
 * For API/DB division filter: returns values to use in .in("division", values) so both
 * canonical and legacy athlete.division values match. Pass the canonical full division (e.g. from filter dropdown).
 */
export function getDivisionFilterValues(canonicalDivision: string): string[] {
  if (!canonicalDivision?.trim()) return []
  const canonical = normalizeToCanonicalFull(canonicalDivision) || canonicalDivision.trim()
  const aliases = DIVISION_QUERY_ALIASES[canonical]
  if (aliases) return [...new Set([canonical, ...aliases])]
  return [canonical]
}
