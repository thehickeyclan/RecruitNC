/**
 * Is this wrestler an NC United Blue member right now?
 *
 * One question, three answers depending on who is asking, and conflating them is what made Blue
 * reporting unreliable for months:
 *
 * - **Paying** — money arrives. This is the revenue number.
 * - **Comped** — a scholarship or staff place. A member in every sense except the money.
 * - **Entitled** — paying OR comped. This is the one that gates features.
 *
 * Two systems hold memberships, deliberately. WrestlingIQ carries the original cohort, never
 * migrated because making 34 families re-enter card details is how you lose a third of them;
 * it shrinks as they graduate, out to the class of 2030. Stripe carries everyone since. A
 * wrestler is a member if either says so.
 *
 * Every rule here exists because its absence cost something real:
 *
 * - A `$0.00` WrestlingIQ subscription on a discount code counted as revenue, so four graduated
 *   wrestlers inflated the paying roster until someone read the list line by line.
 * - Thirteen Stripe rows seeded on 4 March 2026 carry no subscription and have sat at `active`
 *   ever since; eight of those families have cancelled, paused or never paid. A membership with
 *   no subscription and no scholarship is not a membership.
 * - A cancelled member is still owed the days they paid for, so access follows `active_until`,
 *   not status.
 */

/** A row from `blue_memberships` (Stripe side). */
export type StripeMembershipRow = {
  status?: string | null
  stripe_subscription_id?: string | null
  source?: string | null
  ended_at?: string | null
}

/** A row from `blue_wiq_subscriptions` (WrestlingIQ side). */
export type WiqMembershipRow = {
  status?: string | null
  amount_cents?: number | null
  active_until?: string | null
  discount_code?: string | null
}

/** Sources that mean "we are not charging this family, on purpose". */
const COMPED_SOURCES = new Set(["scholarship", "staff", "comp"])

export function isCompedStripeMembership(row: StripeMembershipRow): boolean {
  if (String(row.status ?? "") !== "active") return false
  return COMPED_SOURCES.has(String(row.source ?? "").trim().toLowerCase())
}

/**
 * Paying: active, and a Stripe subscription actually exists.
 *
 * The subscription id is the whole test. The 4 March rows look active and bill nothing.
 */
export function isPayingStripeMembership(row: StripeMembershipRow): boolean {
  if (String(row.status ?? "") !== "active") return false
  if (isCompedStripeMembership(row)) return false
  return Boolean(String(row.stripe_subscription_id ?? "").trim())
}

export function isCompedWiqMembership(row: WiqMembershipRow): boolean {
  if (!isWiqCurrent(row)) return false
  return (row.amount_cents ?? 0) === 0
}

export function isPayingWiqMembership(row: WiqMembershipRow): boolean {
  if (!isWiqCurrent(row)) return false
  return (row.amount_cents ?? 0) > 0
}

/**
 * A current WrestlingIQ membership: active, or behind on a payment but not cancelled.
 *
 * `grace` (cancelled, paid period not yet run out) used to count until `active_until`. Matt,
 * 7 Oct 2026: access ends the day a family cancels, on WIQ as on Stripe - no grace window.
 * `now` stays in the signature for the callers that pass it.
 */
export function isWiqCurrent(row: WiqMembershipRow, _now: Date = new Date()): boolean {
  const status = String(row.status ?? "").trim().toLowerCase()
  return status === "active" || status === "past_due"
}

/**
 * Has this wrestler graduated out of the programme?
 *
 * Membership is about money; this is not. A class of 2025 wrestler sitting in a grace window is
 * in college — keeping him entitled because a subscription has days left is counting a member
 * who left in June. Blue reporting was carrying three of these: Dantrell Williams (2025), and
 * Trevelian Hall and Fares Alkurdasi (2026).
 *
 * A class graduates in June. From July onward that year is alumni, which is why the check is
 * not simply `gradYear < thisYear` — in May 2026 the class of 2026 is still wrestling.
 */
export function hasGraduated(graduationYear: number | null | undefined, now: Date = new Date()): boolean {
  if (graduationYear == null || !Number.isFinite(graduationYear)) return false
  const year = now.getFullYear()
  if (graduationYear < year) return true
  return graduationYear === year && now.getMonth() + 1 >= 7
}

/** Entitled: paying or comped, on either side. This is what unlocks features. */
export function isEntitled(input: {
  stripe?: StripeMembershipRow[]
  wiq?: WiqMembershipRow[]
  /** The wrestler's class. A graduated member is not entitled, whatever the billing says. */
  graduationYear?: number | null
  now?: Date
}): boolean {
  const now = input.now ?? new Date()
  if (hasGraduated(input.graduationYear, now)) return false
  for (const row of input.stripe ?? []) {
    if (isPayingStripeMembership(row) || isCompedStripeMembership(row)) return true
  }
  for (const row of input.wiq ?? []) {
    if (isPayingWiqMembership(row) || isCompedWiqMembership(row)) {
      if (isWiqCurrent(row, now)) return true
    }
  }
  return false
}
