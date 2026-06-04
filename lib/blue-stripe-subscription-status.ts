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
