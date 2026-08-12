import { describe, expect, it } from "vitest"
import { buildTocAthleteInviteMessage } from "@/lib/toc/invite-message"
import { formatTocRegistrationFee } from "@/lib/toc/registration-policy"

describe("buildTocAthleteInviteMessage", () => {
  it("includes confirm URL in email and SMS copy without payment language", () => {
    const url = "https://app.ncwrestlingunited.com/tournament-of-champions/confirm?athlete=550e8400-e29b-41d4-a716-446655440000"
    const msg = buildTocAthleteInviteMessage({
      athleteName: "Tobin McNair",
      weightClass: 157,
      confirmUrl: url,
    })
    expect(msg.subject).toContain("invited")
    expect(msg.emailBody).toContain("Tobin")
    expect(msg.emailBody).toContain("157 lbs")
    expect(msg.emailBody).toContain(url)
    expect(msg.emailBody).toContain("Please confirm and complete secure card payment by August 14, 2026")
    expect(msg.emailBody).not.toContain(formatTocRegistrationFee())
    expect(msg.smsBody).toContain("Confirm by August 14, 2026")
    expect(msg.emailBody).toContain(msg.eventPageUrl)
    expect(msg.smsBody).toContain(url)
    expect(msg.smsBody).not.toContain(formatTocRegistrationFee())
    expect(msg.confirmUrl).toBe(url)
  })
})
