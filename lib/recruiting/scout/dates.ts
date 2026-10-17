/**
 * A rule's school-year date turned into a calendar date for one class (Scout, 17 Oct 2026).
 *
 * The rules library says "April 1 of junior year"; a family asks "when can a coach call us?". The
 * model is never trusted to do that sum (it said "June 15 after sophomore year" for a class of
 * 2028 boy once already), so it is done here and Scout is handed the finished date.
 */
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"]
const GRADE_WORD: Record<string, number> = { freshman: 9, sophomore: 10, junior: 11, senior: 12 }

export type RuleDate = { date: Date; label: string; open: boolean }

/** Null when the rule has no month and day tied to a school year ("Any time", "November 1"). */
export function resolveRuleDate(value: string, classYear: number, now: Date = new Date()): RuleDate | null {
  const v = value.toLowerCase()
  const md = v.match(new RegExp(`\\b(${MONTHS.join("|")})\\s+(\\d{1,2})\\b`))
  const gw = v.match(/\b(freshman|sophomore|junior|senior)\s+year\b/)
  if (!md || !gw) return null
  const month = MONTHS.indexOf(md[1])
  const day = Number(md[2])
  const grade = GRADE_WORD[gw[1]]
  // The school year for a grade runs from the fall of `fall` to the spring after it.
  const fall = classYear - (13 - grade)
  const before = /\bbefore\s+(?:his |her |your )?(freshman|sophomore|junior|senior)\s+year/.test(v)
  const end = /\bend of\s+(?:his |her |your )?(freshman|sophomore|junior|senior)\s+year/.test(v)
  const year = before ? fall : end ? fall + 1 : month >= 6 ? fall : fall + 1
  const date = new Date(Date.UTC(year, month, day, 12))
  const label = date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })
  return { date, label, open: date.getTime() <= now.getTime() }
}
