/**
 * Which season a college wrestling result belongs to, and how to keep last season out.
 *
 * Asking a team site for a season is not the same as being given it. The Nuxt sites answer
 * `/sports/wrestling/schedule/2026-27` with a cheerful 200 and last season's schedule, and the
 * classic sites 302 to the current one — so a scraper that trusts the URL quietly fills the
 * calendar with meets that were wrestled a year ago. The date window is the only real guard.
 */

export type SeasonBounds = { season: string; start: string; end: string }

/**
 * "2026-27" spans August 2026 to July 2027.
 *
 * Wide on purpose at both ends: the season proper runs November to March, but early-season opens
 * creep into late October and the NCAA championships land in March, and a window drawn tightly
 * around the duals would drop both.
 */
export function seasonBounds(season: string): SeasonBounds | null {
  const match = season.trim().match(/^(\d{4})-(\d{2})$/)
  if (!match) return null
  const startYear = Number(match[1])
  if (!Number.isFinite(startYear)) return null
  return { season, start: `${startYear}-08-01`, end: `${startYear + 1}-07-31` }
}

/** The season a date falls in: "2026-27" for anything from August 2026 to July 2027. */
export function seasonForDate(date: string): string | null {
  const match = date.match(/^(\d{4})-(\d{2})/)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null
  const startYear = month >= 8 ? year : year - 1
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`
}

/**
 * The season currently worth collecting, for a given day.
 *
 * From August the new season is the one people want; before that the season in progress still is.
 * `seasonForDate` already draws that line, so "what season is it" and "what season is this meet
 * in" can never disagree.
 */
export function currentSeason(now: Date = new Date()): string {
  const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
  return seasonForDate(iso) ?? `${now.getFullYear()}-${String((now.getFullYear() + 1) % 100).padStart(2, "0")}`
}

export function isInSeason(date: string, season: string): boolean {
  const bounds = seasonBounds(season)
  if (!bounds) return false
  return date >= bounds.start && date <= bounds.end
}
