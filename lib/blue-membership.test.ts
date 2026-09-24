import { describe, expect, it } from "vitest"
import {
  isCompedStripeMembership,
  isCompedWiqMembership,
  hasGraduated,
  isEntitled,
  isPayingStripeMembership,
  isPayingWiqMembership,
  isWiqCurrent,
} from "./blue-membership"

describe("paying, on the Stripe side", () => {
  it("requires a subscription that actually exists", () => {
    /*
     * The 4 March 2026 seeding batch: thirteen rows created active with no subscription, never
     * cleaned up, frozen at active while the real rows tracked reality. Six of those families
     * have since cancelled, one paused, one never paid — and all eight still read as members.
     */
    expect(isPayingStripeMembership({ status: "active", stripe_subscription_id: "sub_123" })).toBe(true)
    expect(isPayingStripeMembership({ status: "active", stripe_subscription_id: null })).toBe(false)
    expect(isPayingStripeMembership({ status: "active", stripe_subscription_id: "  " })).toBe(false)
  })

  it("does not count a cancelled or paused row", () => {
    expect(isPayingStripeMembership({ status: "cancelled", stripe_subscription_id: "sub_1" })).toBe(false)
    expect(isPayingStripeMembership({ status: "paused", stripe_subscription_id: "sub_1" })).toBe(false)
    expect(isPayingStripeMembership({ status: "pending_payment", stripe_subscription_id: "sub_1" })).toBe(false)
  })

  it("keeps a scholarship out of the revenue count", () => {
    const scholarship = { status: "active", source: "scholarship", stripe_subscription_id: null }
    expect(isPayingStripeMembership(scholarship)).toBe(false)
    expect(isCompedStripeMembership(scholarship)).toBe(true)
  })
})

describe("paying, on the WrestlingIQ side", () => {
  it("treats a $0 discount subscription as comped, never as revenue", () => {
    // Four graduated wrestlers on TarheelElite sat in the paying roster this way.
    const comped = { status: "active", amount_cents: 0, discount_code: "TarheelElite" }
    expect(isPayingWiqMembership(comped)).toBe(false)
    expect(isCompedWiqMembership(comped)).toBe(true)
  })

  it("counts a real subscription", () => {
    expect(isPayingWiqMembership({ status: "active", amount_cents: 5100 })).toBe(true)
    expect(isPayingWiqMembership({ status: "active", amount_cents: 3825 })).toBe(true)
  })
})

describe("the days they already paid for", () => {
  const now = new Date("2026-09-24T12:00:00Z")

  it("keeps a cancelled member through their paid window", () => {
    expect(isWiqCurrent({ status: "grace", active_until: "2026-10-16T00:00:00Z" }, now)).toBe(true)
  })

  it("ends access when the window closes", () => {
    expect(isWiqCurrent({ status: "grace", active_until: "2026-09-01T00:00:00Z" }, now)).toBe(false)
  })

  it("never lets a cancelled row with no window through", () => {
    expect(isWiqCurrent({ status: "cancelled", active_until: "2027-01-01T00:00:00Z" }, now)).toBe(false)
    expect(isWiqCurrent({ status: "grace", active_until: null }, now)).toBe(false)
  })
})

describe("isEntitled", () => {
  const now = new Date("2026-09-24T12:00:00Z")

  it("unlocks for a paying member on either side", () => {
    expect(isEntitled({ stripe: [{ status: "active", stripe_subscription_id: "sub_1" }], now })).toBe(true)
    expect(isEntitled({ wiq: [{ status: "active", amount_cents: 5100 }], now })).toBe(true)
  })

  it("unlocks for a scholarship", () => {
    // Gavin Hickey and Jack Aponte: members, not billed.
    expect(isEntitled({ stripe: [{ status: "active", source: "scholarship" }], now })).toBe(true)
  })

  it("stays shut for a 4 March phantom", () => {
    expect(isEntitled({ stripe: [{ status: "active", source: "invite", stripe_subscription_id: null }], now })).toBe(false)
  })

  it("stays shut when every membership has ended", () => {
    expect(
      isEntitled({
        stripe: [{ status: "cancelled", stripe_subscription_id: "sub_1" }],
        wiq: [{ status: "cancelled", amount_cents: 5100, active_until: "2026-08-01T00:00:00Z" }],
        now,
      }),
    ).toBe(false)
  })

  it("a legacy member still inside their paid window keeps access", () => {
    expect(isEntitled({ wiq: [{ status: "grace", amount_cents: 5100, active_until: "2026-10-16T00:00:00Z" }], now })).toBe(true)
  })
})

describe("graduation ends membership, whatever the billing says", () => {
  const now = new Date("2026-09-24T12:00:00Z")

  it("lets a current wrestler through", () => {
    expect(hasGraduated(2027, now)).toBe(false)
    expect(hasGraduated(2031, now)).toBe(false)
  })

  it("treats last June's class as alumni", () => {
    // Trevelian Hall and Fares Alkurdasi, class of 2026, were still entitled in September.
    expect(hasGraduated(2026, now)).toBe(true)
    expect(hasGraduated(2025, now)).toBe(true)
  })

  it("does not graduate a class that is still wrestling", () => {
    // In May 2026 the class of 2026 has not left yet.
    expect(hasGraduated(2026, new Date("2026-05-01T12:00:00Z"))).toBe(false)
    expect(hasGraduated(2026, new Date("2026-07-01T12:00:00Z"))).toBe(true)
  })

  it("shuts entitlement off for a graduate riding out a grace window", () => {
    const grace = { status: "grace", amount_cents: 0, active_until: "2026-09-29T00:00:00Z" }
    expect(isEntitled({ wiq: [grace], now })).toBe(true)
    expect(isEntitled({ wiq: [grace], graduationYear: 2026, now })).toBe(false)
  })

  it("says nothing when the class is unknown", () => {
    expect(hasGraduated(null, now)).toBe(false)
    expect(isEntitled({ stripe: [{ status: "active", stripe_subscription_id: "s" }], graduationYear: null, now })).toBe(true)
  })
})
