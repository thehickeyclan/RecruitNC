import { describe, expect, it } from "vitest"
import {
  canonicalRole,
  emailDomain,
  isCollegeCoachRole,
  isEduEmail,
  needsCoachReview,
  shouldAutoApproveCoach,
} from "./coach-auto-approve"

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

describe("canonicalRole", () => {
  it("folds the picker's spelling onto the queue's spelling", () => {
    // The bug this exists for: the form wrote "college-coach", the admin approval queue counted
    // "college_coach", and four real coaches sat in a queue that rendered as empty.
    expect(canonicalRole("college-coach")).toBe("college_coach")
    expect(canonicalRole("College Coach")).toBe("college_coach")
    expect(canonicalRole("college_coach")).toBe("college_coach")
  })

  it("leaves a bare coach alone", () => {
    // `buildUserProfileUpsertPayload` writes "coach" for high-school and club coaches as well.
    // Folding it into college_coach would hand them minors' phone numbers on a .edu address.
    expect(canonicalRole("coach")).toBe("coach")
    expect(shouldAutoApproveCoach({ role: canonicalRole("coach"), email: "someone@ncsu.edu" })).toBe(false)
  })

  it("keeps the other roles as the database spells them", () => {
    expect(canonicalRole("hs-club-coach")).toBe("hs-club-coach")
    expect(canonicalRole("athlete")).toBe("athlete")
    expect(canonicalRole("")).toBeNull()
    expect(canonicalRole(null)).toBeNull()
  })
})

describe("needsCoachReview", () => {
  const coach = (over: Record<string, unknown> = {}) => ({
    role: "college_coach",
    verified_coach: true,
    verification_status: "pending",
    ...over,
  })

  it("flags a coach the .edu rule let in before anyone looked", () => {
    expect(needsCoachReview(coach())).toBe(true)
    // The spelling the sign-up form used to write must not hide them again.
    expect(needsCoachReview(coach({ role: "college-coach" }))).toBe(true)
  })

  it("stops flagging once a human has decided either way", () => {
    expect(needsCoachReview(coach({ verification_status: "approved" }))).toBe(false)
    expect(needsCoachReview(coach({ verification_status: "rejected" }))).toBe(false)
  })

  it("is not about coaches still waiting for approval", () => {
    // Those are the pending queue; this list is the opposite — already inside, unchecked.
    expect(needsCoachReview(coach({ verified_coach: false }))).toBe(false)
  })

  it("ignores everyone who is not a college coach", () => {
    expect(needsCoachReview(coach({ role: "hs-club-coach" }))).toBe(false)
    expect(needsCoachReview(coach({ role: "athlete" }))).toBe(false)
  })

  it("treats a missing status as unreviewed", () => {
    expect(needsCoachReview(coach({ verification_status: null }))).toBe(true)
  })
})
