/**
 * How often to read Flo's lists.
 *
 * A commitment list is edited a handful of times most weeks and dozens of times in the days
 * either side of a signing window or a big tournament. Reading it daily all year would spend
 * 350 requests to learn what 52 would; reading it weekly in November would let a flip sit
 * unnoticed for six days while a coach is on the phone about that wrestler.
 *
 * So the cron runs every day and this decides whether today is a day that reads. The windows are
 * the recruiting calendar's own: the November signing period, and the week after the events that
 * actually move commitments.
 */

/** The weekday a quiet week reads on. 1 = Monday. */
const WEEKLY_DAY = 1

/**
 * Events that move commitments, as (month, day) the event ends. A run reads daily for
 * DAYS_AFTER_EVENT days afterwards, because the commitments follow the results by about a week.
 *
 * Dates are the recurring slot rather than one year's calendar: Super 32 is the last weekend of
 * October, Fargo the third week of July, and the NHSCA nationals the end of March. A window a day
 * wide either side is cheaper than being wrong about which Saturday it fell on.
 */
const EVENT_WINDOWS: Array<{ name: string; from: [number, number]; to: [number, number] }> = [
  { name: "the November signing period", from: [11, 1], to: [11, 30] },
  { name: "Super 32", from: [10, 24], to: [11, 1] },
  { name: "Fargo", from: [7, 14], to: [7, 28] },
  { name: "NHSCA Nationals", from: [3, 24], to: [4, 7] },
  { name: "the April signing period", from: [4, 9], to: [4, 23] },
]

const within = (now: Date, from: [number, number], to: [number, number]) => {
  const month = now.getMonth() + 1
  const day = now.getDate()
  const value = month * 100 + day
  return value >= from[0] * 100 + from[1] && value <= to[0] * 100 + to[1]
}

export type ScheduleDecision = { run: boolean; cadence: "daily" | "weekly"; reason: string }

export function commitmentRunDecision(now: Date = new Date()): ScheduleDecision {
  const window = EVENT_WINDOWS.find((w) => within(now, w.from, w.to))
  if (window) return { run: true, cadence: "daily", reason: `daily during ${window.name}` }
  if (now.getDay() === WEEKLY_DAY) return { run: true, cadence: "weekly", reason: "the weekly read" }
  return { run: false, cadence: "weekly", reason: `quiet week: the weekly read is on day ${WEEKLY_DAY}` }
}
