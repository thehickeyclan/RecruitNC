/**
 * Official published RecruitNC prospect ranking caps by graduation class.
 * Data Dawg, /public-rankings, and related APIs must never list beyond these.
 */
export const PUBLIC_RANKINGS_MAX_BY_YEAR: Record<number, number> = {
  2026: 30,
  2027: 30,
  2028: 25,
}

/** Default when year is unknown / unpublished — still never dump unbounded ranked lists. */
export const DEFAULT_PUBLIC_RANKINGS_CAP = 30

export function getPublicRankingsMax(year: number | null | undefined): number {
  if (year != null && Number.isFinite(year) && PUBLIC_RANKINGS_MAX_BY_YEAR[year] != null) {
    return PUBLIC_RANKINGS_MAX_BY_YEAR[year]!
  }
  return DEFAULT_PUBLIC_RANKINGS_CAP
}

/** Clamp a requested top-N (or "all") to the official published cap for that class. */
export function clampProspectRankingsLimit(
  year: number | null | undefined,
  requested: number | null | undefined,
): number {
  const max = getPublicRankingsMax(year)
  if (requested == null || !Number.isFinite(requested) || requested <= 0) return max
  return Math.min(Math.floor(requested), max)
}
