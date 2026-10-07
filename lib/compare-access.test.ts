import { describe, expect, it } from "vitest"
import { mayUseComparison } from "./compare-access"

describe("mayUseComparison", () => {
  it("lets verified college coaches and admins in", () => {
    expect(mayUseComparison({ profile: { role: "college_coach", verified_coach: true } })).toBe(true)
    expect(mayUseComparison({ profile: { role: "college-coach", verified_coach: true } })).toBe(true)
    expect(mayUseComparison({ isAdmin: true, profile: { role: "parent" } })).toBe(true)
    expect(mayUseComparison({ profile: { role: "admin" } })).toBe(true)
  })

  it("keeps everyone else out, a verified high school coach included", () => {
    expect(mayUseComparison({ profile: { role: "college_coach", verified_coach: false } })).toBe(false)
    expect(mayUseComparison({ profile: { role: "hs-club-coach", verified_coach: true } })).toBe(false)
    expect(mayUseComparison({ profile: { role: "parent" } })).toBe(false)
    expect(mayUseComparison({ profile: null })).toBe(false)
  })
})
