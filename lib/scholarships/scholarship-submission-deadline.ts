/**
 * Interpret `applications_close_date` (YYYY-MM-DD) as end-of-day America/New_York for submission deadlines.
 * Uses Intl only — no extra timezone dependency.
 */

function pad2(n: number): string {
  return String(n).padStart(2, "0")
}

export function easternCalendarAtUtcMs(ms: number): { y: number; mo: number; d: number } {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  })
  const parts = f.formatToParts(ms)
  const map = Object.fromEntries(parts.filter((p) => p.type !== "literal").map((p) => [p.type, p.value])) as Record<
    string,
    string
  >
  return {
    y: Number(map.year),
    mo: Number(map.month),
    d: Number(map.day),
  }
}

function calendarCompareEt(ms: number, y: number, mo: number, d: number): number {
  const p = easternCalendarAtUtcMs(ms)
  if (p.y !== y) return p.y - y
  if (p.mo !== mo) return p.mo - mo
  return p.d - d
}

/** Earliest UTC instant where the Eastern calendar reads `isoDate` at local midnight (start of that civil day). */
export function easternStartOfDayUtcMs(isoDate: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim())
  if (!m) return NaN
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return NaN

  let lo = Date.UTC(y, mo - 1, d) - 96 * 3600000
  let hi = Date.UTC(y, mo - 1, d) + 96 * 3600000
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2)
    const cmp = calendarCompareEt(mid, y, mo, d)
    if (cmp < 0) lo = mid + 1
    else hi = mid
  }
  if (calendarCompareEt(lo, y, mo, d) !== 0) return NaN
  return lo
}

function gregorianPlusDays(y: number, mo: number, d: number, deltaDays: number): { y: number; mo: number; d: number } {
  const t = Date.UTC(y, mo - 1, d + deltaDays)
  const x = new Date(t)
  return { y: x.getUTCFullYear(), mo: x.getUTCMonth() + 1, d: x.getUTCDate() }
}

/** Last millisecond (UTC) of civil day `isoDate` in Eastern Time. */
export function easternEndOfSubmissionDayUtcMs(isoDate: string): number {
  const start = easternStartOfDayUtcMs(isoDate)
  if (!Number.isFinite(start)) return NaN
  const midDay = start + 12 * 3600000
  const { y, mo, d } = easternCalendarAtUtcMs(midDay)
  const next = gregorianPlusDays(y, mo, d, 1)
  const nextIso = `${next.y}-${pad2(next.mo)}-${pad2(next.d)}`
  const startNext = easternStartOfDayUtcMs(nextIso)
  if (!Number.isFinite(startNext)) return NaN
  return startNext - 1
}

export function scholarshipSubmissionDeadlineUtcMs(closeDateYyyyMmDd: string | null | undefined): number | null {
  if (!closeDateYyyyMmDd?.trim()) return null
  const ms = easternEndOfSubmissionDayUtcMs(closeDateYyyyMmDd.trim())
  return Number.isFinite(ms) ? ms : null
}
