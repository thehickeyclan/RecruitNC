/**
 * The NHSCA High School Nationals grade division of a result (Matt, 29 Oct 2026). The tournament
 * runs Freshman, Sophomore, Junior and Senior brackets (plus Girls and Middle School), and a
 * freshman title is not the senior one: "2026 NHSCA champion" made Howard Hill (freshman, 152)
 * read like the senior champion. Divisions come from the bouts (other_tournament_bouts.division,
 * backfilled from FloArena's bracket labels) and the placers table; the All-American lists carry
 * theirs in the event key ("nhsca-aa-freshman-2024"). Display only: every division counts the same
 * in significant wins and the star rating (Matt, 29 Oct 2026: "equal").
 */

const DIVISIONS = ["Freshman", "Sophomore", "Junior", "Senior", "Girls", "Middle School"] as const
export type NhscaDivision = (typeof DIVISIONS)[number]

/** The division as the tournament names it, from the row's own value or its event key; null when unknown. */
export function nhscaDivision(eventKey: unknown, division: unknown): NhscaDivision | null {
  const named = String(division ?? "").trim().toLowerCase()
  const hit = DIVISIONS.find((d) => d.toLowerCase() === named)
  if (hit) return hit
  const k = String(eventKey ?? "").toLowerCase()
  if (!/nhsca/.test(k)) return null
  if (/middle[-_ ]?school/.test(k)) return "Middle School"
  return DIVISIONS.find((d) => new RegExp(`(^|[-_ ])${d.toLowerCase()}([-_ ]|$)`).test(k)) ?? null
}

/** "2026 NHSCA freshman" (credential prose), or "2026 NHSCA" when the division is unknown. */
export function nhscaLabel(year: number | string, division: NhscaDivision | null, style: "lower" | "title" = "lower"): string {
  if (!division) return `${year} NHSCA`
  return `${year} NHSCA ${style === "lower" ? division.toLowerCase() : division}`
}
