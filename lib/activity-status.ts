/**
 * Is a wrestler still competing? Days since the last result on file, and a flag only when the
 * gap means something (Matt, 9 October 2026: "some kids get injured and haven't competed").
 *
 * Raw days lie in the off-season. North Carolina wrestles November to February, so in October a
 * healthy wrestler who skips freestyle reads ~230 days - flagging that would flag half the state.
 * Two flags instead:
 *
 * - Nothing on file in the last 12 months: a full year covers a season and an off-season.
 * - Nothing on file from the last completed NC season - only for a wrestler whose season we
 *   normally import (any season record on file), and only when they were in high school for it.
 *   Otherwise a gap in our imports would read as an injury.
 *
 * Information only: never an edge, never part of the recommendation. A wrestler coming back
 * from injury is not a worse wrestler, and the coach decides what the gap means. Said as "on
 * file" throughout, because an event we do not import cannot show.
 */

export type ActivityInput = {
  /** Latest result on file, from lib/prospect-last-competed.ts. */
  last: { event: string; date: string } | null
  graduationYear: number | null
  /** Seasons ("2025-26") with in-season bouts on file. */
  seasonsWithBouts: string[]
  /** Years with an NCHSAA state result (the February that closes a season). */
  stateYears: number[]
}

export type ActivityStatus = {
  daysAgo: number | null
  /** "34 days ago" / "No results on file". */
  label: string
  /** "Ultimate Club Duals, Sep 19, 2026". */
  lastEvent: string | null
  flags: string[]
}

const DAY_MS = 86_400_000

/** The NC season that most recently finished, by its starting year: 2025 for 2025-26. */
export function lastCompletedSeasonStart(now: Date): number {
  const month = now.getUTCMonth() + 1
  const year = now.getUTCFullYear()
  // The season closes at States in mid-February; from March it is the one just finished.
  return month >= 3 ? year - 1 : year - 2
}

export function seasonLabel(start: number): string {
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`
}

export function activityStatus(input: ActivityInput, now: Date = new Date()): ActivityStatus {
  const flags: string[] = []
  const lastMs = input.last ? Date.parse(input.last.date) : Number.NaN
  const daysAgo = Number.isFinite(lastMs) ? Math.max(0, Math.floor((now.getTime() - lastMs) / DAY_MS)) : null
  const lastEvent = input.last && Number.isFinite(lastMs)
    ? `${input.last.event}, ${new Date(lastMs).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}`
    : null

  if (daysAgo == null) flags.push("No results on file")
  else if (daysAgo > 365) flags.push("No results on file in the last 12 months")

  // The last completed season, for a wrestler we hold season records for, who was in high school.
  const start = lastCompletedSeasonStart(now)
  const label = seasonLabel(start)
  const inHighSchool = input.graduationYear == null || (start + 1 >= input.graduationYear - 3 && start + 1 <= input.graduationYear)
  const coveredByImports = input.seasonsWithBouts.length > 0
  const wrestledIt =
    input.seasonsWithBouts.includes(label) ||
    input.stateYears.includes(start + 1) ||
    (Number.isFinite(lastMs) && lastMs >= Date.UTC(start, 10, 1) && lastMs <= Date.UTC(start + 1, 2, 1))
  if (coveredByImports && inHighSchool && !wrestledIt && daysAgo != null && daysAgo <= 365) {
    flags.push(`No results on file from the ${label} NC season`)
  }

  return {
    daysAgo,
    label: daysAgo == null ? "No results on file" : daysAgo === 0 ? "Today" : daysAgo === 1 ? "1 day ago" : `${daysAgo} days ago`,
    lastEvent,
    flags,
  }
}
