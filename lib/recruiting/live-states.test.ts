import { describe, expect, it } from "vitest"
import { isVisibleState, liveStates, recruitingCoverage } from "@/lib/recruiting/brand"

describe("states per address", () => {
  it("RecruitWrestlers carries North Carolina, South Carolina, Virginia and Tennessee", () => {
    expect(liveStates(true).map((s) => s.code)).toEqual(["NC", "SC", "VA", "TN"])
    expect(recruitingCoverage(true)).toBe("North Carolina, South Carolina, Virginia, and Tennessee")
    expect(isVisibleState("SC", false, true)).toBe(true)
    expect(isVisibleState("TN", false, true)).toBe(true)
  })
  it("NC United reports North Carolina only, and that is the default", () => {
    expect(liveStates(false).map((s) => s.code)).toEqual(["NC"])
    expect(recruitingCoverage()).toBe("North Carolina")
    expect(isVisibleState("SC", false)).toBe(false)
    expect(isVisibleState("SC", true)).toBe(true) // admins still check other states
  })
  it("states not yet live stay closed everywhere except to admins", () => {
    expect(isVisibleState("MD", false, true)).toBe(false)
    expect(isVisibleState("MD", true, true)).toBe(true)
  })
})
