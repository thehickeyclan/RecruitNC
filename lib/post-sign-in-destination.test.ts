import { describe, expect, it, vi } from "vitest"
vi.mock("server-only", () => ({}))
import { COACH_HOME, coachLanding } from "./post-sign-in-destination"

describe("coachLanding", () => {
  it("sends a coach to My Recruits from the front pages", () => {
    for (const p of [null, "/", "/rankings", "/rankings/2027", "/calendar", "/coach-home", "/public-rankings"]) expect(coachLanding(p)).toBe(COACH_HOME)
  })
  it("keeps a link to a wrestler or a report", () => {
    expect(coachLanding("/view-profile?id=abc")).toBe("/view-profile?id=abc")
    expect(coachLanding("/coach-reports/super32-2026-mens")).toBe("/coach-reports/super32-2026-mens")
    expect(coachLanding("/inbox/123")).toBe("/inbox/123")
  })
})
