import { describe, expect, it } from "vitest"
import { countsAsCoachView } from "./coach-view-rule"

const profile = (over: Record<string, unknown> = {}) => ({
  role: "college_coach",
  profile_type: "fan",
  verified_coach: true,
  email: "coach@williams.edu",
  ...over,
})

describe("countsAsCoachView", () => {
  it("counts a college coach whose profile_type was never maintained", () => {
    // The exact shape that broke the family panel: role right, profile_type stale.
    expect(countsAsCoachView(profile() as never)).toBe(true)
  })

  it("accepts the hyphenated spelling that also exists in prod", () => {
    expect(countsAsCoachView(profile({ role: "college-coach" }) as never)).toBe(true)
  })

  it("does not count an admin browsing", () => {
    expect(countsAsCoachView(profile({ role: "admin" }) as never)).toBe(false)
  })

  it("does not count a parent, athlete or high-school coach", () => {
    for (const role of ["parent", "athlete", "hs-club-coach", "fan"]) {
      expect(countsAsCoachView(profile({ role }) as never)).toBe(false)
    }
  })

  it("does not count Apple's review login or our own domain", () => {
    expect(countsAsCoachView(profile({ email: "thehickeyclan+applereview@gmail.com" }) as never)).toBe(false)
    expect(countsAsCoachView(profile({ email: "appreview@ncwrestlingunited.com" }) as never)).toBe(false)
  })

  it("counts nobody when there is no profile", () => {
    expect(countsAsCoachView(null)).toBe(false)
  })
})
