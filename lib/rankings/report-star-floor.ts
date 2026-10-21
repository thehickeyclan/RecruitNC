import "server-only"
import { applyClassPositionFloor, type StarRating } from "@/lib/athlete-star-rating"
import { classPositionFloorFor } from "@/lib/rankings/class-position-floors-read"

/**
 * The class-position star floor, applied to a built scouting report.
 *
 * Done here rather than inside buildScoutingReport: lib/scouting-report.ts is also imported by the
 * report's browser component, and the saved floors are read with server-only code, so importing
 * them there broke the build (21 October 2026). A star set by hand is left alone - the floor
 * skips any overridden rating.
 */
export async function withClassPositionFloor<T extends { starRating?: StarRating | null }>(report: T, athleteId: string): Promise<T> {
  if (!report.starRating) return report
  const floor = await classPositionFloorFor(athleteId).catch(() => 1)
  return { ...report, starRating: applyClassPositionFloor(report.starRating, floor) }
}

/** The same floor for one rating, for callers that rate a wrestler directly (Scout, the stars route). */
export async function ratingWithClassPositionFloor(rating: StarRating | null, athleteId: string): Promise<StarRating | null> {
  if (!rating) return rating
  return applyClassPositionFloor(rating, await classPositionFloorFor(athleteId).catch(() => 1))
}
