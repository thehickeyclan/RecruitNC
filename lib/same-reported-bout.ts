import { namesLikelySamePerson } from "@/lib/athlete-name-match"

/**
 * The same bout, reported twice.
 *
 * A family's submitted win and the imported bracket rarely agree to the letter - JT Hill's TOC win
 * arrived as "Jay Mills", 19 September, from the family and as "Jeshurun Mills", 18 September,
 * from the bracket - so two entries are one bout when the names could be the same person and the
 * dates are within two days.
 *
 * A misspelt first name is the other way they disagree: Adam Walker's NHSCA win was listed twice,
 * over "Shepard Baumer" (the family) and "Shepherd Baumer" (the bracket). So the same surname at
 * the same event with the same score, within the same two days, is one bout too - nobody beats two
 * Baumers 12-4 at one tournament.
 */
export type ReportedBout = { opponent: string; date: string | null; event?: string | null; result?: string | null }

const dayOf = (date: string | null) => {
  const t = date ? Date.parse(date) : Number.NaN
  return Number.isNaN(t) ? null : t / 86_400_000
}
const surname = (name: string) => name.trim().toLowerCase().split(/\s+/).pop() ?? ""
const eventKey = (event: string | null | undefined) => String(event ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
/** "12-4" out of "Major Decision 12-4" and "MD 12-4"; null for a fall or anything without a score. */
const scoreOf = (result: string | null | undefined) => String(result ?? "").match(/\b(\d{1,2})\s*-\s*(\d{1,2})\b/)?.slice(1, 3).join("-") ?? null

export function sameReportedBout(a: ReportedBout, b: ReportedBout): boolean {
  const da = dayOf(a.date)
  const db = dayOf(b.date)
  const sameDays = da == null || db == null ? a.date === b.date : Math.abs(da - db) <= 2
  if (!sameDays) return false
  if (namesLikelySamePerson(a.opponent, b.opponent)) return true
  const score = scoreOf(a.result)
  return (
    score != null &&
    score === scoreOf(b.result) &&
    surname(a.opponent) !== "" &&
    surname(a.opponent) === surname(b.opponent) &&
    eventKey(a.event) !== "" &&
    eventKey(a.event) === eventKey(b.event)
  )
}
