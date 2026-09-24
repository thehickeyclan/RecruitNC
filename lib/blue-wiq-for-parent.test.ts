import { describe, expect, it } from "vitest"
import { isWiqCurrent } from "./blue-membership"

/*
 * The filter this endpoint applies, stated as a test.
 *
 * A WrestlingIQ parent sees a subscription when it is live, or cancelled but still inside the
 * window they paid for. A subscription that expired months ago is history — showing it in a
 * "Subscription" panel would tell a parent they are still being charged.
 */
describe("what a WrestlingIQ parent should see", () => {
  const now = new Date("2026-09-24T12:00:00Z")

  it("shows a live subscription", () => {
    expect(isWiqCurrent({ status: "active" }, now)).toBe(true)
  })

  it("shows a cancelled one they have already paid through", () => {
    expect(isWiqCurrent({ status: "grace", active_until: "2026-10-16T00:00:00Z" }, now)).toBe(true)
  })

  it("does not present an expired subscription as current", () => {
    expect(isWiqCurrent({ status: "grace", active_until: "2026-06-01T00:00:00Z" }, now)).toBe(false)
    expect(isWiqCurrent({ status: "cancelled", active_until: "2026-10-16T00:00:00Z" }, now)).toBe(false)
  })
})
