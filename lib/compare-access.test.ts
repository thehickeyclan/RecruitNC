import { describe, expect, it } from "vitest"
import { mayUseComparison } from "./compare-access"

describe("mayUseComparison", () => {
  it("lets verified college coaches and admins in", () => {
    expect(mayUseComparison({ profile: { role: "college_coach", verified_coach: true } })).toBe(true)
    expect(mayUseComparison({ profile: { role: "college-coach", verified_coach: true } })).toBe(true)
    expect(mayUseComparison({ isAdmin: true, profile: { role: "parent" } })).toBe(true)
    expect(mayUseComparison({ profile: { role: "admin" } })).toBe(true)
  })

  it("lets a listed tester in, by user id, without making him a coach", () => {
    expect(mayUseComparison({ userId: "8d4ed89c-1a52-48cc-9429-ab5c24875a25", profile: { role: "parent" } })).toBe(true)
    expect(mayUseComparison({ userId: "someone-else", profile: { role: "parent" } })).toBe(false)
  })

  it("keeps everyone else out, a verified high school coach included", () => {
    expect(mayUseComparison({ profile: { role: "college_coach", verified_coach: false } })).toBe(false)
    expect(mayUseComparison({ profile: { role: "hs-club-coach", verified_coach: true } })).toBe(false)
    expect(mayUseComparison({ profile: { role: "parent" } })).toBe(false)
    expect(mayUseComparison({ profile: null })).toBe(false)
  })
})
