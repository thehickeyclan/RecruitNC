import type Stripe from "stripe"
import type { createAdminClient } from "@/lib/supabase/admin"

export type BlueMembershipStripeStatus = "active" | "paused" | "cancelled" | "pending_payment"

export function mapStripeSubscriptionToMembershipStatus(
  subscription: Stripe.Subscription,
  options?: { isDeleted?: boolean },
): {
  status: BlueMembershipStripeStatus
  ended_at: string | null
  next_billing_at: string | null
  resume_at: string | null
} {
  const isDeleted = options?.isDeleted ?? false
  const stripeStatus = subscription.status
  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null

  const isCanceled =
    isDeleted ||
    stripeStatus === "canceled" ||
    stripeStatus === "unpaid" ||
    stripeStatus === "incomplete_expired"

  if (isCanceled) {
    return {
      status: "cancelled",
      ended_at: new Date().toISOString(),
      next_billing_at: null,
      resume_at: null,
    }
  }

  const pauseBehavior = subscription.pause_collection?.behavior
  const isPaused = stripeStatus === "paused" || !!pauseBehavior
  const resumeAt =
    subscription.pause_collection?.resumes_at != null
      ? new Date(subscription.pause_collection.resumes_at * 1000).toISOString()
      : null

  if (isPaused) {
    return {
      status: "paused",
      ended_at: null,
      next_billing_at: periodEnd,
      resume_at: resumeAt,
    }
  }

  if (stripeStatus === "past_due" || stripeStatus === "incomplete") {
    return {
      status: "pending_payment",
      ended_at: null,
      next_billing_at: periodEnd,
      resume_at: null,
    }
  }

  if (stripeStatus === "active" || stripeStatus === "trialing") {
    return {
      status: "active",
      ended_at: null,
      next_billing_at: periodEnd,
      resume_at: null,
    }
  }

  return {
    status: "cancelled",
    ended_at: new Date().toISOString(),
    next_billing_at: null,
    resume_at: null,
  }
}

/** Pull Stripe subscription state into blue_memberships (fixes stale paused/cancelled after admin actions). */
export async function reconcileBlueMembershipsFromStripe(
  stripe: Stripe,
  admin: ReturnType<typeof createAdminClient>,
): Promise<{ updated: number; errors: number }> {
  const { data: rows, error } = await admin
    .from("blue_memberships")
    .select("id, stripe_subscription_id, status")
    .not("stripe_subscription_id", "is", null)

  if (error || !rows?.length) return { updated: 0, errors: error ? 1 : 0 }

  let updated = 0
  let errors = 0
  for (const row of rows) {
    const subId = String(row.stripe_subscription_id ?? "").trim()
    if (!subId) continue
    try {
      const sub = await stripe.subscriptions.retrieve(subId)
      const mapped = mapStripeSubscriptionToMembershipStatus(sub)
      const patch: Record<string, unknown> = {
        status: mapped.status,
        updated_at: new Date().toISOString(),
        next_billing_at: mapped.next_billing_at,
        resume_at: mapped.resume_at,
      }
      if (mapped.ended_at) patch.ended_at = mapped.ended_at
      else if (mapped.status !== "cancelled") patch.ended_at = null

      const statusChanged = row.status !== mapped.status
      const { error: upErr } = await admin.from("blue_memberships").update(patch).eq("id", row.id)
      if (upErr) errors += 1
      else if (statusChanged) updated += 1
    } catch {
      const { error: upErr } = await admin
        .from("blue_memberships")
        .update({
          status: "cancelled",
          ended_at: new Date().toISOString(),
          resume_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id)
        .neq("status", "cancelled")
      if (!upErr && row.status !== "cancelled") updated += 1
      else if (upErr) errors += 1
    }
  }
  return { updated, errors }
}

/**
 * Choose which of a customer's subscriptions a membership row should link to.
 * Prefer a live Blue subscription (newest first); fall back to the most recently
 * created cancelled one so status/ended_at can still be reconciled truthfully.
 */
export function pickBlueSubscriptionToLink(
  subs: Stripe.Subscription[],
  isBlue: (sub: Stripe.Subscription) => boolean,
): Stripe.Subscription | null {
  const blue = subs.filter(isBlue)
  if (!blue.length) return null
  const live = blue.filter((s) => s.status !== "canceled" && s.status !== "incomplete_expired")
  const pool = live.length ? live : blue
  return [...pool].sort((a, b) => (b.created ?? 0) - (a.created ?? 0))[0] ?? null
}

/**
 * Link membership rows that have a Stripe customer but no subscription id.
 *
 * Why these exist: "Sync from Stripe" only scans Checkout Sessions from the last 90 days,
 * so any membership whose session crossed that horizon before linking froze — and
 * reconcileBlueMembershipsFromStripe skips rows with a null subscription id, so once
 * missed they stayed "active" forever regardless of what Stripe said. (13 rows from a
 * 2026-03-04 invite batch sat in exactly this state.) Listing by customer needs no
 * session history, so this heals them permanently.
 *
 * Rows whose customer has NO Blue subscription at all are returned in `noSubscription` —
 * those members genuinely aren't paying, and that's a human decision, not an auto-cancel.
 */
export async function linkBlueMembershipsByCustomer(
  stripe: Stripe,
  admin: ReturnType<typeof createAdminClient>,
  isBlue: (sub: Stripe.Subscription) => boolean,
): Promise<{
  scanned: number
  linked: number
  noSubscription: Array<{ membership_id: string; athlete_id: string | null; stripe_customer_id: string }>
  errors: number
}> {
  const { data: rows, error } = await admin
    .from("blue_memberships")
    .select("id, athlete_id, status, stripe_customer_id")
    .is("stripe_subscription_id", null)
    .not("stripe_customer_id", "is", null)

  if (error || !rows?.length) return { scanned: 0, linked: 0, noSubscription: [], errors: error ? 1 : 0 }

  let linked = 0
  let errors = 0
  const noSubscription: Array<{ membership_id: string; athlete_id: string | null; stripe_customer_id: string }> = []

  for (const row of rows) {
    const customerId = String(row.stripe_customer_id ?? "").trim()
    if (!customerId) continue
    try {
      const list = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 100,
        expand: ["data.items.data.price.product"],
      })
      const pick = pickBlueSubscriptionToLink(list.data, isBlue)
      if (!pick) {
        noSubscription.push({
          membership_id: row.id,
          athlete_id: row.athlete_id ?? null,
          stripe_customer_id: customerId,
        })
        continue
      }

      const mapped = mapStripeSubscriptionToMembershipStatus(pick)
      const patch: Record<string, unknown> = {
        stripe_subscription_id: pick.id,
        status: mapped.status,
        next_billing_at: mapped.next_billing_at,
        resume_at: mapped.resume_at,
        updated_at: new Date().toISOString(),
      }
      if (mapped.ended_at) patch.ended_at = mapped.ended_at

      const { error: upErr } = await admin.from("blue_memberships").update(patch).eq("id", row.id)
      if (upErr) errors += 1
      else linked += 1
    } catch (e) {
      console.error("[blue-link-by-customer]", customerId, e instanceof Error ? e.message : e)
      errors += 1
    }
  }

  return { scanned: rows.length, linked, noSubscription, errors }
}
