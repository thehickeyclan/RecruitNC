import type Stripe from "stripe"

const BLUE_DEFAULT_CENTS = 5500

/** Monthly recurring amount in cents from a Stripe subscription (first item). */
export function monthlyCentsFromStripeSubscription(sub: Stripe.Subscription): number {
  let total = 0
  for (const item of sub.items?.data ?? []) {
    const unit = item.price?.unit_amount ?? 0
    const qty = item.quantity ?? 1
    const interval = item.price?.recurring?.interval
    const intervalCount = item.price?.recurring?.interval_count ?? 1
    if (interval === "year") {
      total += Math.round((unit * qty) / (12 * intervalCount))
    } else if (interval === "week") {
      total += Math.round((unit * qty * 52) / (12 * intervalCount))
    } else {
      total += unit * qty
    }
  }
  return total
}

export async function fetchStripeMrrCentsBySubscriptionId(
  stripe: Stripe,
  subscriptionIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  const unique = [...new Set(subscriptionIds.filter(Boolean))]
  for (const subId of unique) {
    try {
      const sub = await stripe.subscriptions.retrieve(subId)
      if (sub.status === "active" || sub.status === "trialing" || sub.status === "past_due") {
        map.set(subId, monthlyCentsFromStripeSubscription(sub))
      } else {
        map.set(subId, 0)
      }
    } catch {
      map.set(subId, BLUE_DEFAULT_CENTS)
    }
  }
  return map
}

export function dollarsFromCents(cents: number): number {
  return Math.round(cents) / 100
}

/** Seniors (grad year) churn in June of graduation year. */
export function seniorChurnMonthKey(graduationYear: number): string {
  return `${graduationYear}-06`
}

export function buildSeniorChurnByMonth(
  members: Array<{ athleteId: string; gradYear: number; monthlyCents: number }>,
  monthsAhead = 24,
): { month: string; count: number; mrrImpact: number }[] {
  const now = new Date()
  const buckets = new Map<string, { count: number; mrrImpact: number }>()

  for (let i = 0; i < monthsAhead; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    buckets.set(key, { count: 0, mrrImpact: 0 })
  }

  for (const m of members) {
    if (!m.gradYear || m.gradYear < now.getFullYear()) continue
    const key = seniorChurnMonthKey(m.gradYear)
    const b = buckets.get(key)
    if (b) {
      b.count += 1
      b.mrrImpact += m.monthlyCents / 100
    }
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, count: v.count, mrrImpact: Math.round(v.mrrImpact * 100) / 100 }))
}

export function buildCohortRetention(
  rows: Array<{ started_at: string; status: string; ended_at: string | null; stripe_subscription_id?: string | null }>,
): { signupMonth: string; started: number; stillActive: number }[] {
  const hasStripe = (r: (typeof rows)[0]) => !!(r.stripe_subscription_id && String(r.stripe_subscription_id).trim())
  const cohorts = new Map<string, { started: number; stillActive: number }>()

  for (const r of rows) {
    if (!hasStripe(r)) continue
    const d = new Date(r.started_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const c = cohorts.get(key) ?? { started: 0, stillActive: 0 }
    c.started += 1
    if (r.status === "active" || r.status === "paused") c.stillActive += 1
    cohorts.set(key, c)
  }

  return [...cohorts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-18)
    .map(([signupMonth, v]) => ({ signupMonth, ...v }))
}
