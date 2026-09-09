/**
 * Adopting a seeder's order as the official one.
 *
 * The code was built assuming admins seed and everyone else doodles privately, which is backwards
 * from how the tournament is actually run: The NC Mat seeds it, and staff approve. Their order
 * lived in their own `app_metadata` where nobody else could see it — a full ten-weight seeding sat
 * finished and invisible, with a message saying "seeding is done" that nothing on the board
 * reflected.
 *
 * So adoption is explicit rather than automatic. The seeder keeps working right up to the first
 * whistle as wrestlers drop, and each of those changes is a thing staff choose to take, not a
 * thing that happens to the live bracket while nobody is looking.
 */

export type ViewerSeedOrder = {
  userId: string
  email: string | null
  /**
   * The seeder whose order is the tournament's, when several have one.
   *
   * 117 had two saved orders that disagreed, and nothing on the screen said which one counted.
   * The flag lives in Supabase Auth `app_metadata`, like TOC field access, so a seeder cannot
   * award it to themselves.
   */
  isLead: boolean
  /** Invitation ids, best seed first. */
  invitationIds: string[]
}

export type ConfirmedInvitation = {
  invitationId: string
  athleteName: string
  /** The seed currently published for this wrestler, if any. */
  officialSeed: number | null
}

export type AdoptionRow = {
  invitationId: string
  athleteName: string
  seed: number
  officialSeed: number | null
  /** True when adopting moves this wrestler. */
  moved: boolean
}

export type AdoptionPlan =
  | { ok: true; rows: AdoptionRow[]; changed: number }
  | { ok: false; error: string }

/**
 * What adopting one weight would do, before anything is written.
 *
 * Refuses a partial order rather than filling the gaps. A seeder's list that is missing somebody
 * usually means the field moved under them — a wrestler confirmed after they last looked — and
 * quietly seeding that person last is how somebody ends up in the wrong half of a bracket without
 * anyone deciding it.
 */
export function planSeedAdoption(order: string[], confirmed: ConfirmedInvitation[]): AdoptionPlan {
  if (!order.length) return { ok: false, error: "That seeder has no saved order for this weight." }

  const unique = new Set(order)
  if (unique.size !== order.length) {
    return { ok: false, error: "Their order lists the same wrestler twice." }
  }

  const byId = new Map(confirmed.map((row) => [row.invitationId, row]))
  const missing = confirmed.filter((row) => !unique.has(row.invitationId))
  const unknown = order.filter((id) => !byId.has(id))

  if (unknown.length) {
    return {
      ok: false,
      error: `Their order includes ${unknown.length} wrestler${unknown.length === 1 ? "" : "s"} who ${
        unknown.length === 1 ? "is" : "are"
      } no longer confirmed in this weight. Ask them to reload and reseed it.`,
    }
  }
  if (missing.length) {
    return {
      ok: false,
      error: `Their order is missing ${missing.map((row) => row.athleteName).join(", ")}. Ask them to reload and reseed this weight.`,
    }
  }

  const rows = order.map((invitationId, index) => {
    const row = byId.get(invitationId)!
    const seed = index + 1
    return {
      invitationId,
      athleteName: row.athleteName,
      seed,
      officialSeed: row.officialSeed,
      moved: row.officialSeed !== seed,
    }
  })

  return { ok: true, rows, changed: rows.filter((row) => row.moved).length }
}

/** Read every seeder's saved order for one weight, the lead seeder first. */
export function viewerOrdersForWeight(
  users: Array<{ id: string; email?: string | null; app_metadata?: Record<string, unknown> | null }>,
  weightClass: number,
): ViewerSeedOrder[] {
  const out: ViewerSeedOrder[] = []
  for (const user of users) {
    const metadata = user.app_metadata ?? {}
    const raw = metadata["toc_personal_seed_orders"]
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue
    const order = (raw as Record<string, unknown>)[String(weightClass)]
    if (!Array.isArray(order) || !order.length) continue
    out.push({
      userId: user.id,
      email: user.email ?? null,
      isLead: metadata["toc_lead_seeder"] === true,
      invitationIds: order.filter((id): id is string => typeof id === "string"),
    })
  }
  // Lead first: on a weight several people have seeded, the one that counts should not be second.
  return out.sort((a, b) => Number(b.isLead) - Number(a.isLead))
}
