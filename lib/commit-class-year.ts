/** Graduation classes shown on college / high-school commit leaderboards. */
export const COMMIT_CLASS_YEARS = ["2025", "2026", "2027", "2028"] as const

export type CommitClassYear = (typeof COMMIT_CLASS_YEARS)[number]
export type CommitClassYearFilter = CommitClassYear | "all"

/** Default commit filter: current calendar year when listed, else latest class. */
export function getDefaultCommitClassYear(): CommitClassYear {
  const current = String(new Date().getFullYear())
  if ((COMMIT_CLASS_YEARS as readonly string[]).includes(current)) {
    return current as CommitClassYear
  }
  return COMMIT_CLASS_YEARS[COMMIT_CLASS_YEARS.length - 1]
}
