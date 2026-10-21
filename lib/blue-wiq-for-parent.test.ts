import { describe, expect, it } from "vitest"
import { isWiqCurrent } from "./blue-membership"

/*
 * The filter this endpoint applies, stated as a test.
 *
 * A WrestlingIQ parent sees a subscription when it is live. A subscription that expired months
 * ago is history — showing it in a "Subscription" panel would tell a parent they are still being
 * charged. Since 7 Oct 2026 a cancelled one is history too, the same day: access ends when a
 * family cancels, on WrestlingIQ as on Stripe, with no paid-through grace window (Matt).
 */
describe("what a WrestlingIQ parent should see", () => {
  const now = new Date("2026-09-24T12:00:00Z")

  it("shows a live subscription", () => {
    expect(isWiqCurrent({ status: "active" }, now)).toBe(true)
  })

  it("shows one that is behind on a payment but not cancelled", () => {
    expect(isWiqCurrent({ status: "past_due" }, now)).toBe(true)
  })

  it("does not show a cancelled one, even inside the window they paid for", () => {
    expect(isWiqCurrent({ status: "grace", active_until: "2026-10-16T00:00:00Z" }, now)).toBe(false)
  })

  it("does not present an expired subscription as current", () => {
    expect(isWiqCurrent({ status: "grace", active_until: "2026-06-01T00:00:00Z" }, now)).toBe(false)
    expect(isWiqCurrent({ status: "cancelled", active_until: "2026-10-16T00:00:00Z" }, now)).toBe(false)
  })
})
