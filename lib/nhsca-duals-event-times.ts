/**
 * NHSCA Duals 2026 — wall-clock times in Virginia Beach (America/New_York).
 * May 2026 is EDT (UTC−4).
 */

/** Eastern wall-clock → UTC milliseconds (EDT: add 4h to local hour for UTC). */
export function easternWallClockMs(
  year: number,
  month: number,
  day: number,
  hour24: number,
  minute = 0
): number {
  return Date.UTC(year, month - 1, day, hour24 + 4, minute, 0, 0)
}

/** Friday May 22, 2026 · 2:00 PM Eastern — NC United early weigh-ins */
export const NHSCA_WEIGH_IN_TARGET_MS = easternWallClockMs(2026, 5, 22, 14, 0)

/** Saturday May 23, 2026 · 8:00 AM Eastern — first round wrestling */
export const NHSCA_FIRST_ROUND_TARGET_MS = easternWallClockMs(2026, 5, 23, 8, 0)

/** NHSCA High School Nationals 2026 — start of tournament day (ET calendar). */
export const NHSCA_NATIONALS_2026_DAY_MS = easternWallClockMs(2026, 3, 27, 0, 0)

export type NhscaDualsCountdownPhase = "weigh_in" | "first_round" | "underway"

export function getNhscaDualsCountdownPhase(nowMs = Date.now()): NhscaDualsCountdownPhase {
  if (nowMs < NHSCA_WEIGH_IN_TARGET_MS) return "weigh_in"
  if (nowMs < NHSCA_FIRST_ROUND_TARGET_MS) return "first_round"
  return "underway"
}

export function nhscaDualsCountdownTargetMs(phase: NhscaDualsCountdownPhase): number {
  return phase === "first_round" ? NHSCA_FIRST_ROUND_TARGET_MS : NHSCA_WEIGH_IN_TARGET_MS
}

export function nhscaDualsCalendarDayLabel(phase: NhscaDualsCountdownPhase, calendarDays: number): string {
  if (phase === "first_round") {
    return calendarDays === 1 ? "day until Saturday first round" : "days until Saturday first round"
  }
  return calendarDays === 1 ? "day until Friday weigh-ins" : "days until Friday weigh-ins"
}

export function nhscaDualsCountdownReadyMessage(phase: NhscaDualsCountdownPhase): string {
  if (phase === "first_round") return "Weigh-ins open — first round Saturday 8 AM ET"
  return "We're here — Duals week!"
}

const ET_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

/** YYYY-MM-DD in America/New_York */
export function easternDateKey(ms: number): string {
  return ET_DATE.format(new Date(ms))
}

/** Calendar days from now (ET) to target (ET). Wed → Fri = 2. */
export function easternCalendarDaysUntil(nowMs: number, targetMs: number): number {
  const [ny, nm, nd] = easternDateKey(nowMs).split("-").map(Number)
  const [ty, tm, td] = easternDateKey(targetMs).split("-").map(Number)
  const nowDay = Date.UTC(ny, nm - 1, nd)
  const targetDay = Date.UTC(ty, tm - 1, td)
  return Math.max(0, Math.round((targetDay - nowDay) / 86400000))
}

export function formatCountdownDuration(ms: number): string {
  const d = Math.max(0, ms)
  const days = Math.floor(d / 86400000)
  const hours = Math.floor((d % 86400000) / 3600000)
  const minutes = Math.floor((d % 3600000) / 60000)
  const parts: string[] = []
  if (days > 0) parts.push(`${days} day${days === 1 ? "" : "s"}`)
  if (hours > 0 || days > 0) parts.push(`${hours} hr${hours === 1 ? "" : "s"}`)
  if (minutes > 0 || parts.length > 0) parts.push(`${minutes} min`)
  return parts.length > 0 ? parts.join(", ") : "under 1 min"
}
