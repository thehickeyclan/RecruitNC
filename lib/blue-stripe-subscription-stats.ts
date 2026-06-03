import type Stripe from "stripe"
import { mapStripeSubscriptionToMembershipStatus } from "@/lib/blue-stripe-subscription-status"
import { monthlyCentsFromStripeSubscription } from "@/lib/blue-reports-stripe-mrr"
import { isBlueStripeTestSubscription } from "@/lib/blue-stripe-test-accounts"

export type BlueStripeSubscriptionBucket = "active" | "paused" | "canceling" | "cancelled" | "past_due"

export type BlueStripeSubscriptionStats = {
  total: number
  active: number
  paused: number
  cancelingAtPeriodEnd: number
  cancelled: number
  pastDue: number
  mrrCents: number
  /** Test/internal subscriptions excluded from totals. */
  excludedTestAccounts: number
}

export function isBlueStripeSubscription(sub: Stripe.Subscription, bluePriceId?: string): boolean {
  for (const item of sub.items?.data ?? []) {
    const priceId = item.price?.id
    if (bluePriceId && priceId === bluePriceId) return true
    const product = item.price?.product
    if (typeof product === "object" && product && !("deleted" in product && product.deleted)) {
      const name = String((product as Stripe.Product).name ?? "").toLowerCase()
      if (name.includes("blue program") || name.includes("nc united blue")) return true
    }
    const nickname = String(item.price?.nickname ?? "").toLowerCase()
    if (nickname.includes("blue")) return true
  }
  return false
}

/** Classify a Blue Stripe subscription to match the Stripe dashboard buckets. */
export function classifyBlueStripeSubscription(sub: Stripe.Subscription): {
  bucket: BlueStripeSubscriptionBucket
  countsTowardMrr: boolean
} {
  const mapped = mapStripeSubscriptionToMembershipStatus(sub)
  if (mapped.status === "cancelled") {
    return { bucket: "cancelled", countsTowardMrr: false }
  }
  if (mapped.status === "paused") {
    return { bucket: "paused", countsTowardMrr: true }
  }
  if (mapped.status === "pending_payment") {
    return { bucket: "past_due", countsTowardMrr: false }
  }
  if (sub.cancel_at_period_end) {
    return { bucket: "canceling", countsTowardMrr: true }
  }
  return { bucket: "active", countsTowardMrr: true }
}

export function aggregateBlueStripeSubscriptionStats(
  subs: Stripe.Subscription[],
): BlueStripeSubscriptionStats {
  const stats: BlueStripeSubscriptionStats = {
    total: 0,
    active: 0,
    paused: 0,
    cancelingAtPeriodEnd: 0,
    cancelled: 0,
    pastDue: 0,
    mrrCents: 0,
    excludedTestAccounts: 0,
  }
  for (const sub of subs) {
    stats.total += 1
    const { bucket, countsTowardMrr } = classifyBlueStripeSubscription(sub)
    if (bucket === "active") stats.active += 1
    else if (bucket === "paused") stats.paused += 1
    else if (bucket === "canceling") stats.cancelingAtPeriodEnd += 1
    else if (bucket === "cancelled") stats.cancelled += 1
    else if (bucket === "past_due") stats.pastDue += 1
    if (countsTowardMrr) {
      stats.mrrCents += monthlyCentsFromStripeSubscription(sub)
    }
  }
  return stats
}

/** Live counts from Stripe (source of truth for RecruitNC billing). */
export async function fetchBlueStripeSubscriptionStats(
  stripe: Stripe,
  bluePriceId?: string,
): Promise<BlueStripeSubscriptionStats> {
  const blueSubs: Stripe.Subscription[] = []
  let excludedTestAccounts = 0
  let startingAfter: string | undefined
  let hasMore = true

  while (hasMore) {
    const page = await stripe.subscriptions.list({
      status: "all",
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
      expand: ["data.items.data.price", "data.customer"],
    })
    for (const sub of page.data) {
      if (!isBlueStripeSubscription(sub, bluePriceId)) continue
      if (isBlueStripeTestSubscription(sub)) {
        excludedTestAccounts += 1
        continue
      }
      blueSubs.push(sub)
    }
    hasMore = page.has_more
    startingAfter = page.data.length > 0 ? page.data[page.data.length - 1].id : undefined
    if (!page.data.length) hasMore = false
  }

  const stats = aggregateBlueStripeSubscriptionStats(blueSubs)
  stats.excludedTestAccounts = excludedTestAccounts
  return stats
}
