import { describe, expect, it } from "vitest"
import {
  formatPrice,
  isSubscriptionLive,
  resolveEntitlement,
  SCOUTING_REPORT_PRICES,
  type EntitlementInput,
} from "@/lib/scouting-report-entitlement"

const base: EntitlementInput = {
  allowlisted: false,
  allowlistActive: false,
  isAdmin: false,
  isCollegeCoach: false,
  isOwnProfile: false,
  hasActiveSubscription: false,
  hasPurchasedThisAthlete: false,
}

describe("pre-launch allowlist", () => {
  it("is the only rule while it is in force", () => {
    // A college coach and an admin are both refused during a private test.
    const refused = resolveEntitlement({ ...base, allowlistActive: true, isAdmin: true, isCollegeCoach: true })
    expect(refused.canAccess).toBe(false)
  })

  it("does not offer to sell anything while nothing is on sale", () => {
    const refused = resolveEntitlement({ ...base, allowlistActive: true })
    expect(refused.purchasable).toBe(false)
  })

  it("lets the tester in", () => {
    expect(resolveEntitlement({ ...base, allowlistActive: true, allowlisted: true })).toMatchObject({
      canAccess: true,
      reason: "allowlist",
    })
  })
})

describe("free access", () => {
  it("never charges a family for their own wrestler", () => {
    expect(resolveEntitlement({ ...base, isOwnProfile: true })).toMatchObject({
      canAccess: true,
      reason: "own_profile",
      purchasable: false,
    })
  })

  it("never charges a college coach", () => {
    // Their reading is the credential that makes the report worth buying to everyone else.
    expect(resolveEntitlement({ ...base, isCollegeCoach: true })).toMatchObject({
      canAccess: true,
      reason: "college_coach",
    })
  })

  it("lets admins through", () => {
    expect(resolveEntitlement({ ...base, isAdmin: true }).reason).toBe("admin")
  })

  it("prefers the free reason when somebody also has a subscription", () => {
    // A coach who subscribed should not be told they are here on the subscription.
    expect(
      resolveEntitlement({ ...base, isCollegeCoach: true, hasActiveSubscription: true }).reason,
    ).toBe("college_coach")
  })
})

describe("paid access", () => {
  it("grants unlimited access on a live subscription", () => {
    expect(resolveEntitlement({ ...base, hasActiveSubscription: true })).toMatchObject({
      canAccess: true,
      reason: "subscription",
    })
  })

  it("grants access to a single report that was bought", () => {
    expect(resolveEntitlement({ ...base, hasPurchasedThisAthlete: true }).reason).toBe("purchased")
  })

  it("offers the paywall to everybody else", () => {
    expect(resolveEntitlement(base)).toMatchObject({
      canAccess: false,
      reason: "none",
      purchasable: true,
    })
  })
})

describe("isSubscriptionLive", () => {
  const future = new Date(Date.now() + 30 * 86_400_000).toISOString()
  const past = new Date(Date.now() - 2 * 86_400_000).toISOString()

  it("accepts active and trialing", () => {
    expect(isSubscriptionLive({ status: "active", current_period_end: future })).toBe(true)
    expect(isSubscriptionLive({ status: "trialing", current_period_end: future })).toBe(true)
  })

  it("refuses past_due, so a failed card does not keep paying for itself", () => {
    // Stripe retries for days; leaving access on through that window is a silent freebie.
    expect(isSubscriptionLive({ status: "past_due", current_period_end: future })).toBe(false)
  })

  it("refuses canceled and unknown statuses", () => {
    expect(isSubscriptionLive({ status: "canceled", current_period_end: future })).toBe(false)
    expect(isSubscriptionLive({ status: "", current_period_end: future })).toBe(false)
    expect(isSubscriptionLive(null)).toBe(false)
  })

  it("honours a paid-up period that has not ended after cancellation", () => {
    expect(isSubscriptionLive({ status: "active", current_period_end: past })).toBe(false)
    expect(isSubscriptionLive({ status: "active", current_period_end: null })).toBe(true)
  })
})

describe("prices", () => {
  it("are the agreed figures", () => {
    expect(formatPrice(SCOUTING_REPORT_PRICES.single)).toBe("$4.99")
    expect(formatPrice(SCOUTING_REPORT_PRICES.subscription)).toBe("$9.99")
  })

  it("keeps the subscription at twice the single report", () => {
    // The upgrade has to stay obvious: two reports pay for a month.
    expect(SCOUTING_REPORT_PRICES.subscription).toBe(SCOUTING_REPORT_PRICES.single * 2 + 1)
  })
})
