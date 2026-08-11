import { describe, expect, it } from "vitest"
import { ACADEMIC_MAJOR_OPTIONS, resolveAcademicMajor } from "./academic-majors"

describe("resolveAcademicMajor", () => {
  it("stores the picked option as-is", () => {
    expect(resolveAcademicMajor("Sports Management", "")).toBe("Sports Management")
  })

  it("stores what they typed when they pick Other", () => {
    expect(resolveAcademicMajor("Other", " Marine Biology ")).toBe("Marine Biology")
  })

  it("keeps the column NULL rather than empty", () => {
    // An unanswered dropdown and an empty "Other" box both mean "they did not say".
    expect(resolveAcademicMajor("", "")).toBeNull()
    expect(resolveAcademicMajor("Other", "   ")).toBeNull()
  })

  it("offers Undecided, so the honest answer is a real choice", () => {
    expect(ACADEMIC_MAJOR_OPTIONS).toContain("Undecided")
  })
})
