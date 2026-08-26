import { beforeAll, describe, expect, it } from "vitest"
import { coachLinkFor, signAthleteToken, verifyAthleteToken } from "./coach-link"

beforeAll(() => {
  process.env.TOC_COACH_LINK_SECRET = "test-secret-for-signing-coach-links"
})

describe("coach links", () => {
  it("verifies a link we issued", () => {
    const id = "11111111-2222-3333-4444-555555555555"
    expect(verifyAthleteToken(id, signAthleteToken(id))).toBe(true)
  })

  it("refuses a token issued for a different wrestler", () => {
    // Otherwise one family's link would designate coaches for every athlete in the field.
    const a = "11111111-2222-3333-4444-555555555555"
    const b = "99999999-8888-7777-6666-555555555555"
    expect(verifyAthleteToken(b, signAthleteToken(a))).toBe(false)
  })

  it("refuses a guessed or empty token", () => {
    const id = "11111111-2222-3333-4444-555555555555"
    expect(verifyAthleteToken(id, "")).toBe(false)
    expect(verifyAthleteToken(id, "not-a-real-token-not-a-real-token")).toBe(false)
  })

  it("builds a link carrying both the wrestler and the signature", () => {
    const id = "11111111-2222-3333-4444-555555555555"
    const url = new URL(coachLinkFor("https://app.ncwrestlingunited.com", id))
    expect(url.pathname).toBe("/tournament-of-champions/corner-coaches")
    expect(url.searchParams.get("a")).toBe(id)
    expect(verifyAthleteToken(id, url.searchParams.get("t") ?? "")).toBe(true)
  })
})
