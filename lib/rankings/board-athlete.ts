/**
 * Shape repair for a ranking board row before it renders.
 *
 * The board is served from a ten-minute `unstable_cache` that outlives a deploy, so a payload
 * built by older code can reach newer code. When `all_american` changed from `string | null` to
 * `string[]`, the cached string hit `all_american?.map(...)` — optional chaining catches null,
 * not a string — and the whole class went to the error boundary with "t.map is not a function".
 * A stale field should cost its own badge, not the page.
 */

/** Every field the card iterates. A row missing one of these must not take the page down. */
export const BOARD_ARRAY_FIELDS = [
  "evidence",
  "data_gaps",
  "head_to_head",
  "all_american",
  "nhsca_by_year",
  "super32_by_year",
  "fargo_by_year",
  "state_placements",
  "significant_wins",
  "significant_losses",
] as const

export function normalizeBoardAthlete<T>(athlete: T): T {
  const fixed: Record<string, unknown> = { ...(athlete as Record<string, unknown>) }
  for (const field of BOARD_ARRAY_FIELDS) {
    const value = fixed[field]
    if (Array.isArray(value)) continue
    // A single stale value is still a real result: keep it as a one-item list rather than
    // dropping evidence the admin is meant to review.
    fixed[field] = value == null || value === "" ? [] : [value]
  }
  return fixed as T
}
