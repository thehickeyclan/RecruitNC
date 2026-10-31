import "server-only"

/**
 * Two Stripe accounts, one per business.
 *
 *   ncu    NC United's account (STRIPE_SECRET_KEY): Blue, store, TOC, national team, giving.
 *   guild  Guild Ventures' account (GUILD_STRIPE_SECRET_KEY): the recruiting memberships,
 *          Insider and the Recruiting Command Center, on every address (Matt, 22 Oct 2026:
 *          "we need everything on Guild ventures stripe"). Guild Ventures owns RecruitWrestlers.
 *
 * New recruiting sales go to Guild Ventures as soon as its key is on the deployment. Subscriptions
 * bought before that stay on NC United's account until they end; each row in
 * recruitnc_subscriptions records which account bills it (stripe_account), so the portal, the
 * status lookup and an upgrade's cancellation all reach the right one.
 */
export type StripeAccount = "ncu" | "guild"

export function stripeSecretFor(account: StripeAccount): string {
  const raw = process.env[account === "guild" ? "GUILD_STRIPE_SECRET_KEY" : "STRIPE_SECRET_KEY"]
  return typeof raw === "string" ? raw.trim() : ""
}

/**
 * Where a new recruiting membership is sold: Guild Ventures once its key is set. Until then
 * NC United's address keeps selling on NC United's account, so nothing stops while the account is
 * set up; recruitwrestlers.com sells nothing (its buy buttons say memberships open at launch).
 */
export function recruitingSalesAccount(onRecruitWrestlers: boolean): StripeAccount | null {
  if (stripeSecretFor("guild")) return "guild"
  if (onRecruitWrestlers) return null
  return stripeSecretFor("ncu") ? "ncu" : null
}

/** The account a stored subscription row bills on; rows from before the column existed are NC United's. */
export function accountOfRow(row: { stripe_account?: string | null } | null | undefined): StripeAccount {
  return row?.stripe_account === "guild" ? "guild" : "ncu"
}
