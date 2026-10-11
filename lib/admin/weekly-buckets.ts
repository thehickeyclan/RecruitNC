/**
 * Counts by week, for the admin bar charts.
 *
 * Weeks run Monday to Sunday in Eastern time, because that is the week the people reading the
 * chart live in: a profile claimed at 9pm on a Sunday in Raleigh is already Monday in UTC, and
 * bucketing by UTC would put it in a week nobody would recognise it from.
 */

const TZ = "America/New_York"
const DAY_MS = 86_400_000

/** The Eastern calendar date of an instant, as a UTC-midnight timestamp so days can be subtracted safely. */
function easternDay(at: Date): number {
  const [y, m, d] = at.toLocaleDateString("en-CA", { timeZone: TZ }).split("-").map(Number)
  return Date.UTC(y, m - 1, d)
}

/** The Monday that starts the Eastern week containing `at`, as YYYY-MM-DD. */
export function weekStart(at: Date): string {
  const day = easternDay(at)
  const sinceMonday = (new Date(day).getUTCDay() + 6) % 7
  return new Date(day - sinceMonday * DAY_MS).toISOString().slice(0, 10)
}

export type WeekBucket = { weekStart: string; label: string; count: number }

/**
 * The last `weeks` weeks ending with the current one, oldest first, every week present even at
 * zero - a gap in a bar chart reads as missing data, not as a quiet week.
 */
export function weeklyCounts(timestamps: Array<string | null | undefined>, weeks: number, now: Date = new Date()): WeekBucket[] {
  const current = Date.parse(weekStart(now))
  const buckets = new Map<string, WeekBucket>()
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(current - i * 7 * DAY_MS)
    const key = start.toISOString().slice(0, 10)
    const label = start.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" })
    buckets.set(key, { weekStart: key, label, count: 0 })
  }
  for (const ts of timestamps) {
    if (!ts) continue
    const at = new Date(ts)
    if (Number.isNaN(at.getTime())) continue
    const bucket = buckets.get(weekStart(at))
    if (bucket) bucket.count++
  }
  return [...buckets.values()]
}
