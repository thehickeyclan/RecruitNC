import type Stripe from "stripe"

export type BlueMembershipStaffAlertKind = "paused" | "cancel_scheduled" | "cancelled"

export function detectBlueMembershipStaffAlert(params: {
  subscription: Stripe.Subscription
  isDeleted: boolean
  previousAttributes?: Partial<Stripe.Subscription> | null
  previousMembershipStatus?: string | null
}): BlueMembershipStaffAlertKind | null {
  const { subscription, isDeleted, previousAttributes, previousMembershipStatus } = params

  if (previousMembershipStatus === "cancelled" && !isDeleted && subscription.status !== "canceled") {
    // Already churned — ignore stray Stripe updates unless it's a fresh cancel event.
    if (!subscription.cancel_at_period_end) return null
  }

  if (isDeleted || subscription.status === "canceled") {
    if (previousMembershipStatus === "cancelled") return null
    return "cancelled"
  }

  const nowPaused = subscription.status === "paused" || !!subscription.pause_collection?.behavior
  const wasPaused =
    previousMembershipStatus === "paused" || !!previousAttributes?.pause_collection?.behavior

  if (nowPaused && !wasPaused) {
    return "paused"
  }

  if (subscription.cancel_at_period_end === true && previousAttributes?.cancel_at_period_end !== true) {
    return "cancel_scheduled"
  }

  return null
}
