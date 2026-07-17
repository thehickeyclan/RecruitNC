import { describe, expect, it } from "vitest"
import { MAX_TRIAL_MS, MIN_TRIAL_MS, resolveWiqTrialEnd } from "@/lib/blue-wiq-migration"

const NOW = Date.parse("2026-07-17T12:00:00Z")
const inMs = (ms: number) => new Date(NOW + ms).toISOString()
const DAY = 24 * 60 * 60 * 1000

describe("resolveWiqTrialEnd", () => {
  it("anchors the first Stripe charge to the family's WIQ renewal date", () => {
    // e.g. Garrison Raper renews 7/19; registering on 7/17 must not double-charge him.
    const due = inMs(10 * DAY)
    expect(resolveWiqTrialEnd(due, NOW)).toBe(Math.floor(Date.parse(due) / 1000))
  })

  it("returns Unix SECONDS, which is what Stripe expects — not milliseconds", () => {
    const due = inMs(10 * DAY)
    const result = resolveWiqTrialEnd(due, NOW)!
    expect(result).toBeLessThan(10_000_000_000)
    expect(result * 1000).toBe(Date.parse(due))
  })

  it("bills immediately when renewal is closer than Checkout's 48h trial minimum", () => {
    // They're at renewal anyway — paying Stripe today IS the renewal, and the WIQ sub
    // gets cancelled right after checkout.
    expect(resolveWiqTrialEnd(inMs(24 * 60 * 60 * 1000), NOW)).toBeNull()
    expect(resolveWiqTrialEnd(inMs(MIN_TRIAL_MS - 60_000), NOW)).toBeNull()
  })

  it("bills immediately when the renewal date is already past", () => {
    expect(resolveWiqTrialEnd(inMs(-3 * DAY), NOW)).toBeNull()
  })

  it("refuses a months-long free ride from stale mirror data", () => {
    // WIQ bills monthly; a next-due 60 days out means the import is stale, not that the
    // family prepaid. Charge today rather than trust it.
    expect(resolveWiqTrialEnd(inMs(60 * DAY), NOW)).toBeNull()
    expect(resolveWiqTrialEnd(inMs(MAX_TRIAL_MS + DAY), NOW)).toBeNull()
  })

  it("tolerates missing or junk dates rather than throwing mid-checkout", () => {
    expect(resolveWiqTrialEnd(null, NOW)).toBeNull()
    expect(resolveWiqTrialEnd(undefined, NOW)).toBeNull()
    expect(resolveWiqTrialEnd("not-a-date", NOW)).toBeNull()
    expect(resolveWiqTrialEnd("", NOW)).toBeNull()
  })
})
