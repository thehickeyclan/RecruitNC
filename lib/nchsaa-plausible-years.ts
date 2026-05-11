/**
 * Tournament year window for matching `wrestling_nchsaa_results` to an athlete graduation year.
 * NCHSAA entries are high school; the window avoids merging a different person with the same name
 * (e.g. junior Jacob Perry placers from years that cannot belong to class of 2028).
 *
 * Lower bound: freshman-or-above state years (~ grad − 3) with one year slack for profile/label noise.
 * Upper bound: allow grad year mis-entry by a few years so recent state years are not dropped.
 */

export function plausibleNchsaaYearsForGradYear(graduationYear: number): { min: number; max: number } {
  const y = Number(graduationYear)
  if (!y || isNaN(y)) return { min: 0, max: 9999 }
  const maxYear = Math.min(2035, y + 4)
  const minYear = Math.max(1990, y - 4)
  return { min: minYear, max: maxYear }
}
