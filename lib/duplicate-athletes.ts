/**
 * Deciding when two athlete rows are one person, and which value wins when they disagree.
 *
 * Kept apart from the CLI in `scripts/merge-duplicate-athletes.ts` so the rules can be tested
 * without a database. They are the whole judgement in the merge: everything else is mechanical
 * repointing of the fifty-three tables that carry an `athlete_id`.
 */

/** First and last token. A nickname sits in the middle and must not key the group. */
export function firstLast(name: string): string {
  const parts = String(name ?? "")
    .toLowerCase()
    .replace(/[‘’“”"']/g, " ")
    .replace(/[^a-z ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
  return parts.length < 2 ? parts.join(" ") : `${parts[0]} ${parts[parts.length - 1]}`
}


/**
 * How much a row is worth keeping: information, and only information.
 *
 * A Tournament of Champions invitation deliberately carries no weight. The merge repoints
 * `toc_invitations` to whichever row survives, so the registration — and the payment on it —
 * follows the survivor either way. Scoring it would have kept Amanuel Kahsai's empty profile
 * over the one holding his 37 bouts and his NHSCA result, which is the exact wrong answer and
 * the reason he was rated one star.
 */
export function survivorScore(row: Record<string, unknown>, matchRows: number): number {
  const filled = Object.values(row).filter((v) => v !== null && v !== "" && !(Array.isArray(v) && !v.length)).length
  const claimed = row.claimed_by_user_id ? 200 : 0
  return filled + matchRows * 10 + claimed + (row.profile_verified ? 50 : 0)
}

/**
 * The few conflicts where the duplicate holds the truer value.
 *
 * - **A flag that is true beat a flag that is false.** These are all "this happened" markers —
 *   verified, matches uploaded, admin reviewed — and the event does not un-happen because a
 *   second row never heard about it.
 * - **A real NC United team beats "none".** The Blue signup is what created several of these
 *   duplicates in the first place, so the newer row is the one that knows he is Blue, and the
 *   older row's "none" is simply stale. Discarding it would drop a paying member's team.
 *
 * Everything else stays a human decision and is printed rather than resolved. A prospect
 * ranking of 74 against 75 is a duplicate sitting in two slots at once, and which number to
 * keep is a question about the rankings, not about this merge.
 */
export function prefersDuplicate(column: string, keepValue: unknown, dupValue: unknown): boolean {
  if (typeof keepValue === "boolean" && typeof dupValue === "boolean") return dupValue && !keepValue
  if (column === "ncUnitedTeam") {
    const stale = String(keepValue ?? "").trim().toLowerCase()
    const other = String(dupValue ?? "").trim().toLowerCase()
    return (stale === "none" || stale === "") && other !== "" && other !== "none"
  }
  return false
}
