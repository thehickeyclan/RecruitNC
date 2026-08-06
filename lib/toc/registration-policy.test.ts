import { describe, expect, it } from "vitest"
import {
  formatTocRegistrationFee,
  TOC_REGISTRATION_PAYMENT_DUE_DISPLAY,
  isConfirmPastDeadline,
  isRegistrationPaymentPastDue,
  registrationPaymentDueDisplay,
  tocInviteConfirmLines,
} from "@/lib/toc/registration-policy"

describe("toc registration policy", () => {
  it("keeps current invitations open through the August 11 extension", () => {
    expect(isConfirmPastDeadline("2026-07-29", new Date(2026, 7, 11, 12, 0, 0))).toBe(false)
    expect(isConfirmPastDeadline("2026-07-29", new Date(2026, 7, 12, 0, 0))).toBe(true)
  })

  it("uses fixed August 11 payment deadline", () => {
    expect(registrationPaymentDueDisplay()).toBe(TOC_REGISTRATION_PAYMENT_DUE_DISPLAY)
    expect(isRegistrationPaymentPastDue(new Date(2026, 7, 11, 12, 0, 0))).toBe(false)
    expect(isRegistrationPaymentPastDue(new Date(2026, 7, 12, 12, 0, 0))).toBe(true)
  })

  it("invite lines ask for verbal confirm only (no payment in email)", () => {
    const lines = tocInviteConfirmLines()
    expect(lines.join(" ")).toContain("August 11, 2026")
    expect(lines.join(" ")).toContain("secure card payment")
    expect(lines.join(" ")).not.toContain(formatTocRegistrationFee())
  })
})
