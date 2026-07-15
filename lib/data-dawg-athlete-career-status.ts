/**
 * Whether an athlete has finished the high school competitive window.
 * Class of Y completes after the spring season of year Y (June+).
 */

export function athleteHasCompletedHighSchoolCareer(
  graduationYear?: number | null,
  asOf: Date = new Date(),
): boolean {
  if (graduationYear == null || !Number.isFinite(Number(graduationYear))) return false
  const gy = Math.floor(Number(graduationYear))
  const y = asOf.getFullYear()
  const month = asOf.getMonth() // 0 = Jan … 5 = June
  if (gy < y) return true
  if (gy > y) return false
  return month >= 5
}
