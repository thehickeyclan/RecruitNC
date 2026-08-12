import { describe, expect, it } from "vitest"
import {
  formatTocRegistrationFee,
  TOC_REGISTRATION_PAYMENT_DUE_DISPLAY,
  isConfirmPastDeadline,
  isInvitationPaymentPastDue,
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
    expect(isRegistrationPaymentPastDue(new Date("2026-08-12T03:59:59.999Z"))).toBe(false)
    expect(isRegistrationPaymentPastDue(new Date("2026-08-12T04:00:00.000Z"))).toBe(true)
  })

  it("honors a per-invitation extension for confirmation and payment", () => {
    const extension = "2026-08-14T03:59:59.999Z"
    expect(isConfirmPastDeadline("2026-08-11", new Date("2026-08-13T16:00:00Z"), extension)).toBe(false)
    expect(isInvitationPaymentPastDue(extension, new Date("2026-08-13T16:00:00Z"))).toBe(false)
    expect(isInvitationPaymentPastDue(extension, new Date("2026-08-14T04:00:00Z"))).toBe(true)
  })

  it("invite lines ask for verbal confirm only (no payment in email)", () => {
    const lines = tocInviteConfirmLines()
    expect(lines.join(" ")).toContain("August 11, 2026")
    expect(lines.join(" ")).toContain("secure card payment")
    expect(lines.join(" ")).not.toContain(formatTocRegistrationFee())
  })
})
