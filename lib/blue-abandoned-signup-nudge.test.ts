import { describe, expect, it } from "vitest"
import {
  isSignupNudgeEligible,
  NUDGE_MAX_AGE_MS,
  NUDGE_MIN_AGE_MS,
} from "@/lib/blue-abandoned-signup-nudge"
import {
  abandonedNudgeDedupeKey,
  paymentFailedDedupeKey,
} from "@/lib/blue-billing-notifications"

const NOW = Date.parse("2026-07-17T12:00:00Z")
const ago = (ms: number) => new Date(NOW - ms).toISOString()

describe("isSignupNudgeEligible", () => {
  it("nudges an abandoned signup inside the 4h–7d window", () => {
    expect(isSignupNudgeEligible({ status: "pending_payment", created_at: ago(5 * 60 * 60 * 1000) }, NOW)).toBe(true)
    expect(isSignupNudgeEligible({ status: "pending_payment", created_at: ago(3 * 24 * 60 * 60 * 1000) }, NOW)).toBe(true)
  })

  it("waits 4 hours — they may still be mid-checkout", () => {
    expect(isSignupNudgeEligible({ status: "pending_payment", created_at: ago(30 * 60 * 1000) }, NOW)).toBe(false)
    expect(isSignupNudgeEligible({ status: "pending_payment", created_at: ago(NUDGE_MIN_AGE_MS - 1000) }, NOW)).toBe(false)
  })

  it("never nudges stale abandons — this shipped with a 21-signup backlog >90 days old", () => {
    expect(isSignupNudgeEligible({ status: "pending_payment", created_at: ago(8 * 24 * 60 * 60 * 1000) }, NOW)).toBe(false)
    expect(isSignupNudgeEligible({ status: "pending_payment", created_at: ago(120 * 24 * 60 * 60 * 1000) }, NOW)).toBe(false)
    expect(isSignupNudgeEligible({ status: "pending_payment", created_at: ago(NUDGE_MAX_AGE_MS + 1000) }, NOW)).toBe(false)
  })

  it("never nudges a signup that paid", () => {
    expect(isSignupNudgeEligible({ status: "paid", created_at: ago(5 * 60 * 60 * 1000) }, NOW)).toBe(false)
  })

  it("tolerates bad rows rather than throwing", () => {
    expect(isSignupNudgeEligible({ status: "pending_payment", created_at: null }, NOW)).toBe(false)
    expect(isSignupNudgeEligible({ status: "pending_payment", created_at: "not-a-date" }, NOW)).toBe(false)
    expect(isSignupNudgeEligible({ status: null, created_at: ago(5 * 60 * 60 * 1000) }, NOW)).toBe(false)
  })
})

describe("dedupe keys", () => {
  it("keys dunning on the invoice — Stripe retries the same invoice, parent gets one email", () => {
    expect(paymentFailedDedupeKey("in_123", "sub_1")).toBe("payment_failed:in_123")
    // Retries of the same invoice produce the same key.
    expect(paymentFailedDedupeKey("in_123", "sub_1")).toBe(paymentFailedDedupeKey("in_123", "sub_1"))
    // A NEW failed invoice next month gets a new key — that failure deserves a fresh notice.
    expect(paymentFailedDedupeKey("in_456", "sub_1")).not.toBe(paymentFailedDedupeKey("in_123", "sub_1"))
  })

  it("caps at one notice per subscription per month when Stripe omits the invoice id", () => {
    const july = new Date("2026-07-05T00:00:00Z")
    const julyLater = new Date("2026-07-28T00:00:00Z")
    const august = new Date("2026-08-02T00:00:00Z")
    expect(paymentFailedDedupeKey(null, "sub_1", july)).toBe(paymentFailedDedupeKey(null, "sub_1", julyLater))
    expect(paymentFailedDedupeKey(null, "sub_1", july)).not.toBe(paymentFailedDedupeKey(null, "sub_1", august))
  })

  it("keys the abandoned nudge on the signup — one nudge ever", () => {
    expect(abandonedNudgeDedupeKey("sig_1")).toBe("abandoned_nudge:sig_1")
  })
})
