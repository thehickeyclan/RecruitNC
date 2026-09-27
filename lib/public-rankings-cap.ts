/**
 * Official published RecruitNC prospect ranking cap.
 * Data Dawg, /public-rankings, club pages and related surfaces never list beyond this.
 *
 * We rank a top 30. This was briefly 20 between 29 July 2026 and this change, which hid
 * ten ranked wrestlers per class from every public surface at once — the single reason to
 * keep this number in one file.
 */
export const DEFAULT_PUBLIC_RANKINGS_CAP = 30

/**
 * Per-class caps, and the list of classes the public endpoints will serve at all.
 *
 * `/api/public-rankings` answers 404 for any year missing here, so a class left off cannot be
 * published no matter what the board does — pressing Publish would write the ranks, sync the
 * app and send the notification, and the page it linked to would still say the class does not
 * exist. 2029 was in exactly that state.
 *
 * A year being listed does not make it visible: nothing shows until `prospect_ranking` is
 * written, which only Publish does.
 */
/**
 * Classes explicitly released to customers and public-facing ranking surfaces.
 *
 * A class must be added here only when Matt releases it. Saving ranks in the admin board is not
 * publication. Keeping this empty prevents draft boards from leaking through class pages, APIs,
 * profiles, schools, clubs or Data Dawg before the announcement.
 */
export const PUBLIC_RANKINGS_MAX_BY_YEAR: Record<number, number> = {
  2027: 30,
  2028: 30,
  // A year younger than the others, and the evidence thins out quickly below ten.
  2029: 10,
}

/**
 * Which classes are live to customers — separate from how deep each one goes.
 *
 * These were the same map, so locking the release meant emptying the caps, and the depths
 * (30, 30 and 10) went with them: a publish would then have fallen back to the default 30 and
 * put twenty unranked 2029 wrestlers on a public page. Depth is a property of the board;
 * release is a decision about a date. Keeping them apart lets one change without the other.
 *
 * Empty means nothing is public. Admins still see every board, so the release can be checked
 * before it is announced.
 */
export const PUBLIC_RELEASED_YEARS: readonly number[] = []

/** The cross-class Top 70 is released separately from the class boards. */
export const PUBLIC_TOP_PROSPECTS_RELEASED = false

export const PUBLISHED_PUBLIC_RANKINGS_YEARS = [...PUBLIC_RELEASED_YEARS].sort((a, b) => a - b)

/** Every class the site ranks, released or not — what an admin preview may reach. */
export const RANKED_CLASS_YEARS = Object.keys(PUBLIC_RANKINGS_MAX_BY_YEAR)
  .map(Number)
  .sort((a, b) => a - b)

export function isPublicRankingsYearPublished(year: number | null | undefined): year is number {
  return year != null && Number.isFinite(year) && PUBLIC_RELEASED_YEARS.includes(year)
}

/** A class an admin may preview: ranked by us, whether or not it has been released. */
export function isRankedClassYear(year: number | null | undefined): year is number {
  return year != null && Number.isFinite(year) && PUBLIC_RANKINGS_MAX_BY_YEAR[year] != null
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
