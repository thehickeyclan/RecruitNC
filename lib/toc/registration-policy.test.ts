import { describe, expect, it } from "vitest"
import {
  formatTocRegistrationFee,
  TOC_CONFIRM_WITHIN_DAYS,
  TOC_REGISTRATION_PAYMENT_DUE_DISPLAY,
  isConfirmPastDeadline,
  isRegistrationPaymentPastDue,
  registrationPaymentDueDisplay,
  tocInviteRegistrationLines,
} from "@/lib/toc/registration-policy"

describe("toc registration policy", () => {
  it("sets confirm deadline 7 days after invite", () => {
    expect(isConfirmPastDeadline("2026-06-01", new Date("2026-06-05"))).toBe(false)
    expect(isConfirmPastDeadline("2026-06-01", new Date("2026-06-10"))).toBe(true)
  })

  it("uses fixed August 1 payment deadline", () => {
    expect(registrationPaymentDueDisplay()).toBe(TOC_REGISTRATION_PAYMENT_DUE_DISPLAY)
    expect(isRegistrationPaymentPastDue(new Date(2026, 6, 31, 12, 0, 0))).toBe(false)
    expect(isRegistrationPaymentPastDue(new Date(2026, 7, 2, 12, 0, 0))).toBe(true)
  })

  it("includes fee and deadlines in invite lines", () => {
    const lines = tocInviteRegistrationLines()
    expect(lines.join(" ")).toContain(String(TOC_CONFIRM_WITHIN_DAYS))
    expect(lines.join(" ")).toContain(formatTocRegistrationFee())
    expect(lines.join(" ")).toContain("August 1, 2026")
  })
})
