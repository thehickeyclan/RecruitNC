/**
 * No middle school results anywhere (Matt, 1 October 2026).
 *
 * High school starts when middle school ends: 1 June of the year his class starts ninth grade,
 * four years before it graduates. A result counts only if its event falls on or after that day, so
 * Fargo the summer after eighth grade counts and NCHSAA States in eighth grade does not. Most tables publish a
 * year without a date, so each event's month decides which side of the line it sits on - Super 32
 * in late October is freshman fall, so "Super 32 2023" is high school for the class of 2027, while
 * NCHSAA States in February 2023 would be his eighth-grade season.
 *
 * One exception, applied where state results are loaded: an NCISA state tournament result counts
 * at any grade. Private schools wrestle eighth graders on varsity, and a state title is a state title.
 */

/** When each event runs, for results that carry a year only. Same calendar as the scouting report. */
export const EVENT_MONTH: Record<string, number> = {
  NCHSAA: 2,
  "NCHSAA States": 2,
  NHSCA: 3,
  "NHSCA Nationals": 3,
  Fargo: 7,
  "Super 32 Early Entry": 9,
  "Tournament of Champions": 9,
  Journeymen: 10,
  "Super 32": 10,
}

/** The first day of high school for a graduating class. */
export function highSchoolStart(graduationYear: number): string {
  return `${graduationYear - 4}-06-01`
}

/**
 * Whether an event belongs to the wrestler's high school years. With no class year on file there
 * is nothing to measure against, so the result is kept. With no date and no known month, the
 * conservative reading is the spring calendar: the year must be his freshman spring or later.
 */
export function isHighSchoolEvent(input: {
  graduationYear: number | null | undefined
  year: number | null | undefined
  eventDate?: string | null
  event?: string | null
}): boolean {
  const grad = Number(input.graduationYear)
  if (!Number.isFinite(grad) || grad < 1990) return true
  const start = highSchoolStart(grad)
  const date = (input.eventDate ?? "").slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date >= start
  const year = Number(input.year)
  if (!Number.isFinite(year)) return true
  const month = input.event ? EVENT_MONTH[input.event] : undefined
  if (month == null) return year >= grad - 3
  return `${year}-${String(month).padStart(2, "0")}-15` >= start
}

/**
 * Whether a match-record season ("2024-25") is a high school season. The season's state tournament
 * is in its spring, so 2024-25 is the class of 2028's freshman year and the class of 2029's eighth
 * grade. A grade recorded on the row below ninth settles it; "Career" rows cannot be placed and stay.
 */
export function isHighSchoolSeason(
  season: string | null | undefined,
  graduationYear: number | null | undefined,
  grade?: unknown,
): boolean {
  const g = Number(String(grade ?? "").match(/\d+/)?.[0])
  if (Number.isFinite(g) && g >= 5 && g <= 8) return false
  const grad = Number(graduationYear)
  if (!Number.isFinite(grad) || grad < 1990) return true
  const m = String(season ?? "").match(/(\d{4})\s*[-/]\s*(\d{2,4})/)
  if (!m) return true
  return Number(m[1]) + 1 >= grad - 3
}

/** A bout's date as YYYY-MM-DD, from "2026-02-19", "12/20/2025" or "12/27 - 12/28/2024". */
export function boutDate(raw: unknown): string | null {
  const s = String(raw ?? "").trim()
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const us = s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/)
  const yearAtEnd = s.match(/(\d{4})\s*$/)
  if (us) {
    const year = us[3] ? (us[3].length === 2 ? `20${us[3]}` : us[3]) : yearAtEnd?.[1]
    if (year) return `${year}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`
  }
  return null
}

/** Bouts from high school only; an undated bout stays (there is nothing to measure). */
export function highSchoolBouts<T extends { date?: unknown; event_date?: unknown }>(
  bouts: readonly T[],
  graduationYear: number | null | undefined,
): T[] {
  const grad = Number(graduationYear)
  if (!Number.isFinite(grad) || grad < 1990) return [...bouts]
  const start = highSchoolStart(grad)
  return bouts.filter((b) => {
    const d = boutDate(b.date ?? b.event_date)
    return d == null || d >= start
  })
}
