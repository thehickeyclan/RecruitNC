import { describe, expect, it } from "vitest"
import { assertTocAthleteEmailHasNoPrivateBracketsLink } from "@/lib/toc/bracket-public-access"
import { buildTocAthleteInviteMessage } from "@/lib/toc/invite-message"
import { eventPageUrl } from "@/lib/toc/invitation-service"

describe("TOC athlete emails", () => {
  it("invite copy does not link to private brackets path", () => {
    const msg = buildTocAthleteInviteMessage({
      athleteName: "Tobin McNair",
      weightClass: 157,
      confirmUrl: "https://app.ncwrestlingunited.com/tournament-of-champions/confirm?athlete=abc",
    })

    expect(msg.emailBody).not.toContain("/tournament-of-champions/brackets")
    expect(() => assertTocAthleteEmailHasNoPrivateBracketsLink(msg.emailBody)).not.toThrow()
  })

  it("confirmed email template links to event page only (no brackets URL)", () => {
    const body = `<p>Welcome to the field.</p>
<p style="margin:20px 0;"><a href="${eventPageUrl()}">Event page</a></p>`

    expect(body).toContain("/tournament-of-champions")
    expect(body).not.toContain("/tournament-of-champions/brackets")
    expect(() => assertTocAthleteEmailHasNoPrivateBracketsLink(body)).not.toThrow()
  })

  it("guard rejects bracket links while brackets are private", () => {
    expect(() =>
      assertTocAthleteEmailHasNoPrivateBracketsLink(
        '<a href="https://app.ncwrestlingunited.com/tournament-of-champions/brackets">Brackets</a>',
      ),
    ).toThrow(/must not link to brackets/)
  })
})
