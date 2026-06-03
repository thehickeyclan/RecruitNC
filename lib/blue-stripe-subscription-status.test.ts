import { describe, expect, it } from "vitest"
import { mapStripeSubscriptionToMembershipStatus } from "./blue-stripe-subscription-status"

describe("mapStripeSubscriptionToMembershipStatus", () => {
  it("maps pause_collection to paused while Stripe status is active", () => {
    const mapped = mapStripeSubscriptionToMembershipStatus({
      id: "sub_1",
      status: "active",
      current_period_end: Math.floor(new Date("2026-07-01").getTime() / 1000),
      pause_collection: { behavior: "void", resumes_at: Math.floor(new Date("2026-08-01").getTime() / 1000) },
    } as import("stripe").Stripe.Subscription)
    expect(mapped.status).toBe("paused")
    expect(mapped.resume_at).toMatch(/2026-08-01/)
  })

  it("maps deleted subscription to cancelled", () => {
    const mapped = mapStripeSubscriptionToMembershipStatus(
      { id: "sub_1", status: "canceled" } as import("stripe").Stripe.Subscription,
      { isDeleted: true },
    )
    expect(mapped.status).toBe("cancelled")
    expect(mapped.ended_at).toBeTruthy()
  })
})
