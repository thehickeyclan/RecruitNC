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
  it("keeps an older invitation open through the event-wide extension", () => {
    // Invited 29 July, so its own seven days ran out on 5 August. It stays open only
    // because the event-wide floor is later — which is exactly what broke when that floor
    // slipped into the past and every older invite died at once.
    // Absolute instants, not local ones. The deadline is 23:59:59.999 Eastern, so
    // `new Date(2026, 7, 15, 0, 0)` meant "past due" on a machine in ET and "not yet" on a
    // runner in UTC — the test was encoding whoever ran it rather than the rule.
    expect(isConfirmPastDeadline("2026-07-29", new Date("2026-08-14T16:00:00Z"))).toBe(false)
    expect(isConfirmPastDeadline("2026-07-29", new Date("2026-08-15T04:00:00Z"))).toBe(true)
  })

  it("uses the fixed event-wide payment deadline", () => {
    expect(registrationPaymentDueDisplay()).toBe(TOC_REGISTRATION_PAYMENT_DUE_DISPLAY)
    expect(isRegistrationPaymentPastDue(new Date("2026-08-15T03:59:59.999Z"))).toBe(false)
    expect(isRegistrationPaymentPastDue(new Date("2026-08-15T04:00:00.000Z"))).toBe(true)
  })

  it("honors a per-invitation extension for confirmation and payment", () => {
    const extension = "2026-08-14T03:59:59.999Z"
    expect(isConfirmPastDeadline("2026-08-11", new Date("2026-08-13T16:00:00Z"), extension)).toBe(false)
    expect(isInvitationPaymentPastDue(extension, null, new Date("2026-08-13T16:00:00Z"))).toBe(false)
    expect(isInvitationPaymentPastDue(extension, null, new Date("2026-08-14T04:00:00Z"))).toBe(true)
  })

  it("gives a newly sent invitation seven days even after the original event-wide cutoff", () => {
    expect(isInvitationPaymentPastDue(null, "2026-08-12T16:13:57Z", new Date("2026-08-13T00:00:00Z"))).toBe(false)
    expect(isInvitationPaymentPastDue(null, "2026-08-12T16:13:57Z", new Date("2026-08-20T04:00:00Z"))).toBe(true)
  })

  it("uses each new invitation's seven-day deadline in invite copy", () => {
    const lines = tocInviteConfirmLines("2026-08-18T14:00:00.000Z")
    expect(lines.join(" ")).toContain("August 25, 2026")
    expect(lines.join(" ")).not.toContain("August 14, 2026")
    expect(lines.join(" ")).toContain("secure card payment")
    expect(lines.join(" ")).not.toContain(formatTocRegistrationFee())
  })
})
