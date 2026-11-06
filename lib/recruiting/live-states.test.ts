import { describe, expect, it } from "vitest"
import { isVisibleState, liveStates, recruitingCoverage } from "@/lib/recruiting/brand"

describe("states per address", () => {
  it("RecruitWrestlers carries every live state in registration order", () => {
    // Three waves on 6 November 2026, all on the qualifier bar: a profile for every 2026 state
    // qualifier, men and women, with a class year and national results linked. Eight first
    // (DE MN WV AL FL NH IA MA), then seven once the bar was read for both genders
    // (MS KY NJ NY CT MO MI), then the sixteen western states once they were minted from the
    // field instead of the podium - they had been held at 20-47% because only placers were
    // minted, and --include-qualifiers took every one of them to 99.4% or better. Arkansas,
    // Indiana and Texas joined on the same pass: AR had been held on a bad reading (its 8-man
    // brackets are the full field by design, verified at source), IN and TX were podium-mints.
    expect(liveStates(true).map((s) => s.code)).toEqual(
      ["NC", "SC", "VA", "TN", "WV", "DE", "GA", "FL", "AL", "MS", "KY", "IN", "NJ", "NY", "CT", "MA", "NH", "TX", "AR",
       "IA", "MO", "MI", "MN", "NE", "CO", "UT", "ID", "AZ", "SD", "ND", "WA", "KS", "OR", "CA", "MT", "WY", "NV", "NM", "HI"],
    )
    // Past six states the names stop fitting in a sentence; see COVERAGE_NAMES_UP_TO.
    expect(recruitingCoverage(true)).toBe("39 states")
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
