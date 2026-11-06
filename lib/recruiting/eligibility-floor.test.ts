import { describe, expect, it } from "vitest"

import { eligibilityFloor } from "./eligibility-floor"

describe("eligibility floor, read from the rules library", () => {
  it("finds every level's minimum in Learn", () => {
    expect(eligibilityFloor("NCAA Division I")).toMatchObject({ gpa: 2.3, coreCourses: true })
    expect(eligibilityFloor("NCAA Division II")).toMatchObject({ gpa: 2.2, coreCourses: true })
    expect(eligibilityFloor("NCAA Division II")?.shortfall).toMatch(/Partial qualifier/)
    expect(eligibilityFloor("NAIA")).toMatchObject({ gpa: 2.3, coreCourses: false, twoOfThree: { act: 18, sat: 970, gpa: 2.0 } })
    expect(eligibilityFloor("NCAA Division III")).toMatchObject({ gpa: null, none: expect.stringContaining("no NCAA GPA minimum") })
    expect(eligibilityFloor("NJCAA")).toMatchObject({ gpa: null, none: expect.stringContaining("no GPA or test minimum") })
    expect(eligibilityFloor(null)).toBeNull()
  })
})
