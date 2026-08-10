/** Graduation classes shown on college / high-school commit leaderboards. */
export const COMMIT_CLASS_YEARS = ["2025", "2026", "2027", "2028"] as const

export type CommitClassYear = (typeof COMMIT_CLASS_YEARS)[number]
export type CommitClassYearFilter = CommitClassYear | "all"

/** First month of a new recruiting cycle — July, once the season and graduation are done. */
const NEW_CYCLE_START_MONTH = 6 // zero-based: 6 = July

/**
 * The class RecruitNC is currently following — the one still in high school with a senior
 * season ahead of it.
 *
 * A wrestling class graduates in the spring, so from July onward the current seniors have
 * left and the class to highlight is the next one. Reading the calendar year alone meant
 * that every summer the site spent six months leading with a class that had already
 * finished competing: in August 2026 it was still highlighting the class of 2026, whose
 * own senior send-off article says their board is closed.
 *
 * Everything that means "the class we are following now" should call this rather than
 * hardcoding a year, so it rolls over on its own each July.
 */
export function getCurrentSigningClass(now: Date = new Date()): number {
  return now.getMonth() >= NEW_CYCLE_START_MONTH ? now.getFullYear() + 1 : now.getFullYear()
}

/** Default commit filter: the current signing class, clamped to the classes we list. */
export function getDefaultCommitClassYear(): CommitClassYear {
  const current = String(getCurrentSigningClass())
  if ((COMMIT_CLASS_YEARS as readonly string[]).includes(current)) {
    return current as CommitClassYear
  }
  return COMMIT_CLASS_YEARS[COMMIT_CLASS_YEARS.length - 1]
}
