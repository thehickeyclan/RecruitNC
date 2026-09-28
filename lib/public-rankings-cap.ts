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
  /*
   * Fifteen, not ten. Ten forced a straight choice between a 5A state champion and the only
   * heavyweight in the class - two wrestlers subscribers would expect to find here - and there
   * is no honest way to rank one of them out of a class this size. Going five deeper costs
   * nothing and stops the cut deciding the board.
   */
  2029: 15,
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
export const PUBLIC_RELEASED_YEARS: readonly number[] = [2027, 2028, 2029]

/*
 * Retired. The Top 75 Ranked Prospects could only hold wrestlers already ranked on a class
 * board, which left state champions outside a deep 2027 invisible; the Top 75 College Prospects
 * replaces it. Admins still reach it, so the old order stays readable.
 */
export const PUBLIC_TOP_PROSPECTS_RELEASED = false

/*
 * Top 75 College Prospects: the deeper board, which reaches past each class's cut.
 *
 * Separate from publishing it. Publishing saves the cut so the board can be read back and
 * checked; this flag is what lets a subscriber see it. Kept apart on purpose - the order is
 * being worked on by hand, and a publish that also announces itself is one click from putting an
 * unreviewed ranking of minors in front of paying strangers.
 */
export const PUBLIC_TOP_75_COLLEGE_RELEASED = true

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
