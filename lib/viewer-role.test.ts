import { describe, expect, it } from "vitest"
import { classifyViewer, normalizeRole } from "@/lib/viewer-role"

describe("normalizeRole", () => {
  it("folds the hyphen and underscore spellings that both exist in prod", () => {
    expect(normalizeRole("college-coach")).toBe("college_coach")
    expect(normalizeRole("college_coach")).toBe("college_coach")
    expect(normalizeRole("  College-Coach ")).toBe("college_coach")
    expect(normalizeRole("hs-club-coach")).toBe("hs_club_coach")
  })

  it("treats missing role as empty rather than throwing", () => {
    expect(normalizeRole(null)).toBe("")
    expect(normalizeRole(undefined)).toBe("")
  })
})

describe("classifyViewer", () => {
  it("counts a college coach whose profile_type says fan — the bug this exists to fix", () => {
    // 12 verified college coaches in prod look exactly like this.
    const v = classifyViewer({ role: "college_coach", profile_type: "fan", verified_coach: true })
    expect(v.isCollegeCoach).toBe(true)
    expect(v.isCoach).toBe(true)
    expect(v.verifiedCoach).toBe(true)
    expect(v.kind).toBe("college_coach")
  })

  it("counts the hyphenated spelling too", () => {
    expect(classifyViewer({ role: "college-coach", profile_type: "fan" }).isCollegeCoach).toBe(true)
  })

  it("classifies high-school/club coaches as coaches but not college coaches", () => {
    for (const role of ["hs-club-coach", "coach"]) {
      const v = classifyViewer({ role, profile_type: "fan" })
      expect(v.isCoach, role).toBe(true)
      expect(v.isCollegeCoach, role).toBe(false)
      expect(v.kind, role).toBe("hs_coach")
    }
  })

  it("does NOT count admins as coaches", () => {
    // auth-context's isCoach includes admin; that's right for permissions and wrong here —
    // admin accounts are ~1,000 of this site's profile views.
    const v = classifyViewer({ role: "admin", verified_coach: true })
    expect(v.kind).toBe("admin")
    expect(v.isCoach).toBe(false)
    expect(v.isCollegeCoach).toBe(false)
  })

  it("classifies the non-coach roles present in prod", () => {
    expect(classifyViewer({ role: "athlete" }).kind).toBe("athlete")
    expect(classifyViewer({ role: "parent" }).kind).toBe("parent")
    expect(classifyViewer({ role: "fan" }).kind).toBe("fan")
    expect(classifyViewer({ role: "referee" }).kind).toBe("other")
    expect(classifyViewer({ role: "user" }).kind).toBe("other")
    expect(classifyViewer({ role: "other" }).kind).toBe("other")
  })

  it("treats a signed-out viewer as anonymous, never a coach", () => {
    for (const input of [null, undefined]) {
      const v = classifyViewer(input)
      expect(v.kind).toBe("anonymous")
      expect(v.isCoach).toBe(false)
      expect(v.role).toBe("anonymous")
    }
  })

  it("falls back to profile_type only when role is absent", () => {
    expect(classifyViewer({ profile_type: "college-coach" }).isCollegeCoach).toBe(true)
    // role wins when both are present and disagree
    expect(classifyViewer({ role: "athlete", profile_type: "college-coach" }).kind).toBe("athlete")
  })

  it("never reports verified for someone who isn't", () => {
    expect(classifyViewer({ role: "college_coach" }).verifiedCoach).toBe(false)
    expect(classifyViewer({ role: "college_coach", verified_coach: "yes" }).verifiedCoach).toBe(false)
  })
})
