/**
 * How deep a college's roster is at a wrestler's weight (Matt and Muse, 14 Oct 2026): the
 * "is there a spot for me" half of comparing programs.
 *
 * From Muse's nationwide pull of every published roster - 14,577 wrestlers on 540 team rosters,
 * staff removed (NC State verified at 32). Only counts are kept here; the names stay in her file.
 *
 * Three honesty rules, from Muse:
 * - Every count carries the roster's own season. A roster is a snapshot; next fall it is stale,
 *   and the pull is re-run each October.
 * - Redshirts and incoming transfers mean a count is a direction, not a vacancy. The page shows
 *   the numbers and says what they are; it never says "a spot is open".
 * - 30% of rows carry no weight because the school does not print one. A team with no weights is
 *   said to publish none - never shown as empty at a weight.
 */
import data from "@/lib/college-programs/roster-depth.json"

type WeightCount = { n: number; final: number; Fr: number; So: number; Jr: number }
export type TeamDepth = { season: string | null; size: number; withWeight: number; withClass: number; byWeight: Record<string, WeightCount> }

const TEAMS = data.teams as unknown as Record<string, Partial<Record<"mens" | "womens", TeamDepth>>>

export const depthFor = (schoolId: string, team: "mens" | "womens"): TeamDepth | null => TEAMS[schoolId]?.[team] ?? null

/** The college weight classes for 2026-27. */
export const COLLEGE_WEIGHTS = {
  mens: [125, 133, 141, 149, 157, 165, 174, 184, 197, 285],
  womens: [103, 110, 117, 124, 131, 138, 145, 160, 180, 207],
} as const

/**
 * The college weights nearest a high school weight: the class at or just above it, and the one
 * below. A wrestler grows, and a coach recruits for the weight a year or two on, so both are shown.
 */
export function nearestCollegeWeights(weight: number, team: "mens" | "womens"): number[] {
  const classes: readonly number[] = COLLEGE_WEIGHTS[team]
  const above = classes.find((c) => c >= weight)
  const below = [...classes].reverse().find((c) => c < weight)
  return [above, below].filter((c): c is number => c != null)
}

export type WeightLine = { weight: number; wrestlers: number; finalYear: number }

/** The roster at those weights, or null when the team publishes no weights. */
export function depthAtWeights(depth: TeamDepth, weights: number[]): WeightLine[] | null {
  if (depth.withWeight === 0) return null
  return weights.map((w) => ({ weight: w, wrestlers: depth.byWeight[String(w)]?.n ?? 0, finalYear: depth.byWeight[String(w)]?.final ?? 0 }))
}
