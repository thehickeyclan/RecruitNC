/**
 * Official published RecruitNC prospect ranking cap.
 * Data Dawg, /public-rankings, and related surfaces never list beyond top 30.
 */
export const DEFAULT_PUBLIC_RANKINGS_CAP = 30

/** Per-class overrides (all currently 30). Keep the map for published years. */
export const PUBLIC_RANKINGS_MAX_BY_YEAR: Record<number, number> = {
  2026: 30,
  2027: 30,
  2028: 30,
  2029: 30,
}

export function getPublicRankingsMax(_year?: number | null): number {
  if (_year != null && Number.isFinite(_year) && PUBLIC_RANKINGS_MAX_BY_YEAR[_year] != null) {
    return PUBLIC_RANKINGS_MAX_BY_YEAR[_year]!
  }
  return DEFAULT_PUBLIC_RANKINGS_CAP
}

/** Clamp a requested top-N (or "all") to the official published top 30. */
export function clampProspectRankingsLimit(
  year: number | null | undefined,
  requested: number | null | undefined,
): number {
  const max = getPublicRankingsMax(year)
  if (requested == null || !Number.isFinite(requested) || requested <= 0) return max
  return Math.min(Math.floor(requested), max)
}
