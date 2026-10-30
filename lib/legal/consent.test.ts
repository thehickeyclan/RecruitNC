import { describe, expect, it } from "vitest"
import { checkConsent } from "./consent"

describe("checkConsent", () => {
  const now = new Date("2026-10-30T12:00:00Z")
  it("requires the terms for everyone", () => {
    expect(checkConsent({}, "parent", "email", now).ok).toBe(false)
    expect(checkConsent({ termsAccepted: true }, "parent", "email", now)).toMatchObject({ ok: true, record: { age_band: null, marketing_opt_in: false } })
  })
  it("asks an athlete's age, turns away under 13 and needs a guardian for 13-17", () => {
    expect(checkConsent({ termsAccepted: true }, "athlete", "email", now).ok).toBe(false)
    expect(checkConsent({ termsAccepted: true, ageBand: "under-13" }, "athlete", "email", now).ok).toBe(false)
    expect(checkConsent({ termsAccepted: true, ageBand: "13-17" }, "athlete", "email", now).ok).toBe(false)
    expect(checkConsent({ termsAccepted: true, ageBand: "13-17", guardianConsent: true }, "athlete", "google", now)).toMatchObject({ ok: true, record: { age_band: "13-17", guardian_consent: true, source: "google" } })
    expect(checkConsent({ termsAccepted: true, ageBand: "18+", marketingOptIn: true }, "athlete", "email", now)).toMatchObject({ ok: true, record: { age_band: "18+", marketing_opt_in: true } })
  })
})
