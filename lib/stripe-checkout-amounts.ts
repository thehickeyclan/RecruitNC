/** Calendar practice drop-in checkout (see lib/nc-united-calendar/stripe.ts — default 2500 cents). */
export const PRACTICE_DROP_IN_AMOUNT_DOLLARS = 25

/** Wrestling Guild session bookings commonly charge $30 on shared Stripe. */
export const GUILD_TYPICAL_AMOUNT_DOLLARS = 30

const DROP_IN_TOLERANCE_DOLLARS = 1.5

export function amountLooksLikePracticeDropIn(totalDollars: number): boolean {
  const t = Number(totalDollars) || 0
  if (t <= 0) return false
  return Math.abs(t - PRACTICE_DROP_IN_AMOUNT_DOLLARS) <= DROP_IN_TOLERANCE_DOLLARS
}

export function amountLooksLikeGuild(totalDollars: number): boolean {
  const t = Number(totalDollars) || 0
  if (t <= 0) return false
  return Math.abs(t - GUILD_TYPICAL_AMOUNT_DOLLARS) <= 0.01
}
