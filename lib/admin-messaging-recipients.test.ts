import { describe, expect, it } from "vitest"
import { isCollegeCoachRole } from "@/lib/admin-messaging-recipients"

describe("admin messaging college coach exclusion", () => {
  it("recognizes both college coach role formats", () => {
    expect(isCollegeCoachRole("college_coach")).toBe(true)
    expect(isCollegeCoachRole("college-coach")).toBe(true)
    expect(isCollegeCoachRole(" College_Coach ")).toBe(true)
  })

  it("does not exclude other audiences", () => {
    expect(isCollegeCoachRole("coach")).toBe(false)
    expect(isCollegeCoachRole("parent")).toBe(false)
    expect(isCollegeCoachRole(null)).toBe(false)
  })
})
