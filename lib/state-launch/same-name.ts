/**
 * Two wrestlers who really do share a name and a class.
 *
 * The launch board's duplicate gate reads name and class only, so it cannot tell one kid entered
 * twice from two kids called the same thing. On 6 November 2026 four states failed it and three of
 * those four were namesakes - Gavin Floyd (WV) at East Fairmont and North Marion, 120lb and 285lb,
 * both 2027; Braxton Jones (OK) at Carl Albert and Collinsville; Jesse James (MO) at Lathrop and
 * Cassville. Only Maryland's two pairs were one school spelled two ways. With no exception the
 * only way to pass was to merge two real wrestlers into one profile, so three states would have
 * stayed NO-GO forever or lost a kid each.
 *
 * The rule lives here rather than in the script so the two ways it must refuse can be tested.
 */
export type SameNameVerified = { athleteIds?: string[]; note?: string }

/** Entries worth consulting: more than one profile named, and a reason given. */
export function usableSameNameEntries(entries: readonly SameNameVerified[] | undefined): SameNameVerified[] {
  return (entries ?? []).filter((e) => String(e.note ?? "").trim().length > 0 && (e.athleteIds ?? []).length > 1)
}

/**
 * Whether a group of same-name, same-class profiles has been verified as different wrestlers.
 *
 * Refuses two ways on purpose:
 *
 * - **No reason, no clearance.** An entry with a blank note is ignored, the same discipline
 *   `apply-adjudicated-grad-years.ts` applies before it overwrites a held class year. Different
 *   schools are evidence; a hunch is not.
 * - **Every profile or none.** An entry naming three of four leaves a fourth profile nobody has
 *   looked at, which is the case the gate exists for. A group clears only when one entry covers
 *   all of it, so clearing today's pair never clears tomorrow's third profile of the same name.
 */
export function clearsSameNameGroup(
  entries: readonly SameNameVerified[] | undefined,
  groupIds: readonly string[],
): boolean {
  if (groupIds.length < 2) return false
  return usableSameNameEntries(entries).some((e) => {
    const named = new Set(e.athleteIds)
    return groupIds.every((id) => named.has(id))
  })
}
