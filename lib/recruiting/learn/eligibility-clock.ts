/**
 * The Division I eligibility clock, worked out for one wrestler (Matt, 18 Oct 2026).
 *
 * The rule, from the NCAA (June 5 and June 23, 2026 releases): the five-year period starts "upon
 * initial full-time enrollment in college" or "at the beginning of the academic year following
 * their 19th birthday, whichever occurs earlier", for athletes first enrolling full time in fall
 * 2027 or later; a fall 2026 freshman gets the better of the old rules and the new.
 *
 * Not confirmed by an official source: the exact cutoff that decides which academic year follows
 * a summer birthday. So a July, August or September birthday is not guessed - both possible years
 * are returned and the page says to confirm with compliance.
 *
 * Pure and private: the birth month and year never leave the browser.
 */

export type AfterHighSchool = "college" | "gap" | "prep" | "juco1" | "juco2"

export const AFTER_HIGH_SCHOOL: Record<AfterHighSchool, string> = {
  college: "Straight to a Division I college",
  gap: "A year off, then college",
  prep: "A postgraduate year at a prep school, then college",
  juco1: "One year of junior college, then Division I",
  juco2: "Two years of junior college, then Division I",
}

export type ClockInput = { birthYear: number; birthMonth: number; classYear: number; plan: AfterHighSchool }

export type ClockResult = {
  /** The fall the age trigger starts the clock: one year, or two when a summer birthday is unclear. */
  ageFalls: number[]
  /** The fall of first full-time college enrollment (junior college counts as college). */
  collegeFall: number
  /** The fall of first enrollment at the Division I college. */
  d1Fall: number
  /** The clock's start, for each possible age fall. */
  starts: number[]
  /** Seasons left at the Division I college, for each possible start: the fewest first. */
  seasons: number[]
  /** Which rules apply: the new model, the better of both, or the old rules. */
  model: "new" | "better-of" | "old"
}

const SUMMER = new Set([7, 8, 9])

export function eligibilityClock({ birthYear, birthMonth, classYear, plan }: ClockInput): ClockResult {
  const turns19 = birthYear + 19
  // The academic year after the 19th birthday: a birthday early in the year is followed by that
  // fall; one late in the year by the next fall; a summer birthday could be either.
  const ageFalls = birthMonth <= 6 ? [turns19] : birthMonth >= 10 ? [turns19 + 1] : [turns19, turns19 + 1]
  const collegeFall = plan === "gap" || plan === "prep" ? classYear + 1 : classYear
  const d1Fall = plan === "juco1" ? classYear + 1 : plan === "juco2" ? classYear + 2 : collegeFall
  const starts = [...new Set(ageFalls.map((f) => Math.min(f, collegeFall)))].sort((a, b) => a - b)
  // Five academic years from the start; seasons left are those from the Division I fall onward.
  const seasons = [...new Set(starts.map((s) => Math.max(0, Math.min(5, s + 5 - d1Fall))))].sort((a, b) => a - b)
  const model = collegeFall >= 2027 ? "new" : collegeFall === 2026 ? "better-of" : "old"
  return { ageFalls, collegeFall, d1Fall, starts, seasons, model }
}

export const isSummerBirthday = (month: number) => SUMMER.has(month)
