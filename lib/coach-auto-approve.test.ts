import { describe, expect, it } from "vitest"
import { emailDomain, isCollegeCoachRole, isEduEmail, shouldAutoApproveCoach } from "./coach-auto-approve"

describe("emailDomain", () => {
  it("lowercases and takes the part after the last @", () => {
    expect(emailDomain("Coach@NCSU.edu")).toBe("ncsu.edu")
    expect(emailDomain("  coach@ncsu.edu  ")).toBe("ncsu.edu")
  })

  it("rejects addresses that cannot have a domain", () => {
    expect(emailDomain("")).toBeNull()
    expect(emailDomain(null)).toBeNull()
    expect(emailDomain("coach")).toBeNull()
    expect(emailDomain("@ncsu.edu")).toBeNull()
    expect(emailDomain("coach@")).toBeNull()
    expect(emailDomain("coach@localhost")).toBeNull()
    expect(emailDomain("coach@ncsu .edu")).toBeNull()
  })
})

describe("isEduEmail", () => {
  it("accepts .edu and subdomains of it", () => {
    expect(isEduEmail("coach@ncsu.edu")).toBe(true)
    expect(isEduEmail("coach@mail.appstate.edu")).toBe(true)
    expect(isEduEmail("COACH@UNC.EDU")).toBe(true)
  })

  it("rejects domains that only look like .edu", () => {
    // The whole point of the check is that .edu is the *last* label.
    expect(isEduEmail("coach@ncsu.edu.mx")).toBe(false)
    expect(isEduEmail("coach@fake-edu.com")).toBe(false)
    expect(isEduEmail("coach@edu.com")).toBe(false)
    expect(isEduEmail("coach@gmail.com")).toBe(false)
    expect(isEduEmail("coach@ncsu.education")).toBe(false)
  })
})

describe("isCollegeCoachRole", () => {
  it("accepts every spelling the codebase has used", () => {
    expect(isCollegeCoachRole("college-coach")).toBe(true)
    expect(isCollegeCoachRole("college_coach")).toBe(true)
    expect(isCollegeCoachRole("College Coach")).toBe(true)
  })

  it("does not accept the other coach roles", () => {
    // A high-school or club coach must never pick up college-coach access.
    expect(isCollegeCoachRole("hs-club-coach")).toBe(false)
    expect(isCollegeCoachRole("coach")).toBe(false)
    expect(isCollegeCoachRole("club_coach")).toBe(false)
    expect(isCollegeCoachRole("athlete")).toBe(false)
    expect(isCollegeCoachRole(null)).toBe(false)
  })
})

describe("shouldAutoApproveCoach", () => {
  it("approves a college coach on a .edu address", () => {
    expect(shouldAutoApproveCoach({ role: "college-coach", email: "coach@ncsu.edu" })).toBe(true)
  })

  it("requires both halves", () => {
    expect(shouldAutoApproveCoach({ role: "college-coach", email: "coach@gmail.com" })).toBe(false)
    expect(shouldAutoApproveCoach({ role: "athlete", email: "kid@ncsu.edu" })).toBe(false)
    // The one that matters most: a .edu address must not let any other role in.
    expect(shouldAutoApproveCoach({ role: "hs-club-coach", email: "coach@ncsu.edu" })).toBe(false)
    expect(shouldAutoApproveCoach({ role: "fan", email: "someone@unc.edu" })).toBe(false)
  })
})
