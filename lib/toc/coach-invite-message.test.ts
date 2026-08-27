import { describe, expect, it } from "vitest"
import {
  coachInviteHtml,
  coachInviteSms,
  coachInviteText,
  namesSentence,
  TOC_COACH_TICKET_URL,
} from "./coach-invite-message"

describe("namesSentence", () => {
  it("reads the way somebody would say it", () => {
    expect(namesSentence(["Miller"])).toBe("Miller")
    expect(namesSentence(["Miller", "Jones"])).toBe("Miller and Jones")
    expect(namesSentence(["Miller", "Jones", "Perry"])).toBe("Miller, Jones and Perry")
  })

  it("collapses a wrestler named twice", () => {
    expect(namesSentence(["Miller", "Miller"])).toBe("Miller")
  })

  it("never leaves a blank where a name should be", () => {
    expect(namesSentence([])).toBe("your wrestler")
  })
})

describe("the invite", () => {
  const input = { coachName: "John Smith", athleteNames: ["Miller", "Jones"] }

  it("names who put them forward, the ticket link and the bracelet", () => {
    const text = coachInviteText(input)
    expect(text).toContain("Miller and Jones")
    expect(text).toContain(TOC_COACH_TICKET_URL)
    expect(text).toContain("floor access for both days")
  })

  it("opens on the coach's first name, not their full name", () => {
    expect(coachInviteText(input).startsWith("John,")).toBe(true)
  })

  it("fits a text message", () => {
    // Long enough and a carrier splits it into pieces that arrive out of order.
    expect(coachInviteSms(input).length).toBeLessThan(320)
    expect(coachInviteSms(input)).toContain(TOC_COACH_TICKET_URL)
  })

  it("puts the link in the HTML as a real link", () => {
    expect(coachInviteHtml(input)).toContain(`href="${TOC_COACH_TICKET_URL}"`)
  })
})
