/**
 * College coaches' backgrounds, from their own bio pages (Muse, 23 Oct 2026;
 * scripts/import-coach-backgrounds.py): when they started at the school, where they wrestled and
 * their best college result, and where they coached before. What a bio does not say is left out.
 * Lines are built here so Scout and the college page say the same thing, with the season counted
 * in code.
 */
import data from "@/lib/college-programs/coach-backgrounds-2026-27.json"

export type CoachBackground = { name: string; started: number | null; previous: string | null; wrestled: string | null; best: string | null; source: string | null }

const BY_SCHOOL = data.coaches as Record<string, CoachBackground[]>
const nameKey = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "")

export function backgroundFor(schoolId: string, coachName: string): CoachBackground | null {
  return BY_SCHOOL[schoolId]?.find((c) => nameKey(c.name) === nameKey(coachName)) ?? null
}

/** The college season under way: it starts in August, so October 2026 is the 2026-27 season. */
export function seasonStartYear(now = new Date()): number {
  return now.getUTCMonth() >= 7 ? now.getUTCFullYear() : now.getUTCFullYear() - 1
}

const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th"}`

/** "5th season at Campbell (since 2022)", or null when the start year is not stated. */
export function tenureText(b: CoachBackground, schoolName: string, now = new Date()): string | null {
  if (!b.started) return null
  const season = seasonStartYear(now) - b.started + 1
  if (season < 1) return `starts at ${schoolName} in ${b.started}`
  return `${ordinal(season)} season at ${schoolName} (since ${b.started})`
}

/** Everything on one line, no pronouns: "2nd season at NC State (since 2025). Wrestled at NC State: 2x NCAA qualifier. Before: Kent State University (2021–2025)." */
export function backgroundLine(b: CoachBackground, schoolName: string, now = new Date()): string | null {
  const parts = [
    tenureText(b, schoolName, now),
    b.wrestled ? `Wrestled at ${b.wrestled}${b.best ? `: ${b.best}` : ""}` : b.best ? `Best college result: ${b.best}` : null,
    b.previous ? `Before: ${b.previous}` : null,
  ].filter(Boolean)
  return parts.length ? `${parts.join(". ")}.` : null
}
