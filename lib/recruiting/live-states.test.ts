import { describe, expect, it } from "vitest"
import { isVisibleState, liveStates, recruitingCoverage } from "@/lib/recruiting/brand"

describe("states per address", () => {
  it("RecruitWrestlers carries every live state in registration order", () => {
    // Eight opened at once on 6 November 2026, on the qualifier bar: a profile for every 2026
    // state qualifier who has a class year, with national results linked.
    expect(liveStates(true).map((s) => s.code)).toEqual(
      ["NC", "SC", "VA", "TN", "WV", "DE", "GA", "FL", "AL", "MA", "NH", "IA", "MN"],
    )
    // Past six states the names stop fitting in a sentence; see COVERAGE_NAMES_UP_TO.
    expect(recruitingCoverage(true)).toBe("13 states")
    expect(isVisibleState("SC", false, true)).toBe(true)
    expect(isVisibleState("TN", false, true)).toBe(true)
    expect(isVisibleState("GA", false, true)).toBe(true)
  })
  it("NC United reports North Carolina only, and that is the default", () => {
    expect(liveStates(false).map((s) => s.code)).toEqual(["NC"])
    expect(recruitingCoverage()).toBe("North Carolina")
    expect(isVisibleState("SC", false)).toBe(false)
    expect(isVisibleState("SC", true)).toBe(true) // admins still check other states
  })
  it("states not yet live stay closed everywhere except to admins", () => {
    expect(isVisibleState("MD", false, true)).toBe(false) // still red: two genuine duplicates
    expect(isVisibleState("MD", true, true)).toBe(true)
  })
})
