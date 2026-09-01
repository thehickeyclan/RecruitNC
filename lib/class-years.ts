/**
 * Which graduating classes are currently in high school.
 *
 * The prospect filter hardcoded 2026–2029 and kept offering "Class of 2026" through the autumn
 * after they had graduated. Class years move every summer, so they are derived rather than typed.
 *
 * The roll happens at the end of June: from 1 July the class named after that calendar year has
 * left, and the rising seniors take their place. In September 2026 the four classes still
 * wrestling are 2027, 2028, 2029 and 2030.
 */

export const HIGH_SCHOOL_CLASS_COUNT = 4

/** The year the current senior class graduates. */
export function seniorClassYear(now: Date = new Date()): number {
  const year = now.getFullYear()
  /** getMonth() is zero-based, so 6 is July. */
  return now.getMonth() >= 6 ? year + 1 : year
}

/** Senior first, through to the incoming freshmen. */
export function currentClassYears(now: Date = new Date()): number[] {
  const senior = seniorClassYear(now)
  return Array.from({ length: HIGH_SCHOOL_CLASS_COUNT }, (_, i) => senior + i)
}

/** Anyone in this class or earlier has finished high school. */
export function mostRecentGraduatedClassYear(now: Date = new Date()): number {
  return seniorClassYear(now) - 1
}
