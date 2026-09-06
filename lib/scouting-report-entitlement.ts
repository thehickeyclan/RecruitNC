/**
 * Who may open a scouting report, and why.
 *
 * One decision function rather than checks scattered across a route, a button and a page —
 * an entry point that disagrees with its endpoint is how a paywall leaks.
 *
 * The crucial separation: this decides **reach the page**. It never decides whether contact
 * details and academics are included — that follows coach verification, in
 * `scoutingAccessTier`. Nothing about a minor's phone number is for sale at any price, so a
 * bug in billing can expose a report but never personal data.
 *
 * Order matters. Free reasons are checked before paid ones so a family or a coach is never
 * charged for something they are entitled to, and so the reason we report back is the one a
 * person would give.
 */

/** Prices in cents, so the shape of the offer is a config change rather than a rebuild. */
export const SCOUTING_REPORT_PRICES = {
  /** One athlete's report, forever. Impulse-priced: the coach who needs one before Saturday. */
  single: 499,
  /** Unlimited, monthly. */
  subscription: 1499,
} as const

export type ScoutingPurchaseKind = keyof typeof SCOUTING_REPORT_PRICES

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export type EntitlementReason =
  | "allowlist"
  | "admin"
  | "college_coach"
  | "own_profile"
  | "subscription"
  | "purchased"
  | "none"

export type ScoutingEntitlement = {
  canAccess: boolean
  reason: EntitlementReason
  /** True when paying would grant access — drives whether to show a paywall or a plain refusal. */
  purchasable: boolean
}

export type EntitlementInput = {
  /** Pre-launch allowlist is in force and this account is on it. */
  allowlisted: boolean
  /** Allowlist is in force at all. While it is, nothing else grants access. */
  allowlistActive: boolean
  isAdmin: boolean
  isCollegeCoach: boolean
  /** The viewer owns this profile, or is linked to it as a parent. */
  isOwnProfile: boolean
  hasActiveSubscription: boolean
  hasPurchasedThisAthlete: boolean
}

export function resolveEntitlement(input: EntitlementInput): ScoutingEntitlement {
  // Pre-launch, the allowlist is the only rule — see lib/scouting-report-release.ts.
  if (input.allowlistActive) {
    return {
      canAccess: input.allowlisted,
      reason: input.allowlisted ? "allowlist" : "none",
      // Nothing is on sale yet, so a refusal here is not a paywall.
      purchasable: false,
    }
  }

  if (input.isAdmin) return { canAccess: true, reason: "admin", purchasable: false }

  // College coaches are free on purpose: their use is the credential that makes the report
  // worth buying to everybody else, and charging the audience you want reading it is
  // backwards.
  if (input.isCollegeCoach) return { canAccess: true, reason: "college_coach", purchasable: false }

  /**
   * A family never pays for their own wrestler's report. We are monetising their kid's
   * results; charging them to see it is the kind of thing that turns into a post rather than
   * a purchase, and it is also what drives them to fill in the film and GPA the report needs.
   */
  if (input.isOwnProfile) return { canAccess: true, reason: "own_profile", purchasable: false }

  if (input.hasActiveSubscription) return { canAccess: true, reason: "subscription", purchasable: false }
  if (input.hasPurchasedThisAthlete) return { canAccess: true, reason: "purchased", purchasable: false }

  return { canAccess: false, reason: "none", purchasable: true }
}

/** Stripe subscription statuses that still grant access. */
const LIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"])

/**
 * Is a stored subscription row still good?
 *
 * `past_due` deliberately does not count. Stripe retries a failed payment for days, and
 * leaving access on through that window means a lapsed card quietly keeps paying for itself.
 * The period end is honoured when present so somebody who cancels keeps what they paid for.
 */
export function isSubscriptionLive(
  row: { status?: string | null; current_period_end?: string | null } | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!row) return false
  const status = String(row.status ?? "").trim().toLowerCase()
  if (!LIVE_SUBSCRIPTION_STATUSES.has(status)) return false
  const end = row.current_period_end ? Date.parse(row.current_period_end) : NaN
  if (Number.isFinite(end) && end < now.getTime()) return false
  return true
}
