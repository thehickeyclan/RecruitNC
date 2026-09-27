import { describe, expect, it } from "vitest"
import { canSeeProspectRanking, hasPremiumAccess } from "./ranking-visibility"

describe("canSeeProspectRanking", () => {
  it("hides the ranking from a signed-out visitor", () => {
    // The whole board could otherwise be reconstructed by walking the public roster.
    expect(canSeeProspectRanking(null)).toBe(false)
    expect(canSeeProspectRanking({})).toBe(false)
  })

  it("hides it from a signed-in account with no membership", () => {
    expect(canSeeProspectRanking({ role: "user", isBlueMember: false })).toBe(false)
  })

  it("shows it to a paying Blue member", () => {
    expect(canSeeProspectRanking({ isBlueMember: true })).toBe(true)
  })

  it("shows it to a college coach, by role or by verification", () => {
    expect(canSeeProspectRanking({ role: "college_coach" })).toBe(true)
    expect(canSeeProspectRanking({ isVerifiedCoach: true })).toBe(true)
  })

  it("shows a wrestler their own ranking", () => {
    // Telling somebody they are ranked and hiding the number from them is worse than not
    // ranking them.
    expect(canSeeProspectRanking({ isOwnProfile: true })).toBe(true)
  })

  it("shows it to an admin", () => {
    expect(canSeeProspectRanking({ isAdmin: true })).toBe(true)
  })

  it("is not fooled by a role that merely contains the word coach", () => {
    expect(canSeeProspectRanking({ role: "coach" })).toBe(false)
  })
})

describe("the paid alternative to Blue", () => {
  it("lets a RecruitNC subscriber see the rankings", () => {
    expect(canSeeProspectRanking({ hasSubscription: true })).toBe(true)
  })

  it("still refuses an account with neither a membership nor a subscription", () => {
    expect(canSeeProspectRanking({ isBlueMember: false, hasSubscription: false })).toBe(false)
  })

  it("does not require a subscription from a Blue member", () => {
    expect(canSeeProspectRanking({ isBlueMember: true, hasSubscription: false })).toBe(true)
  })

  it("reads a hyphenated college coach role, which production also stores", () => {
    // 13 of 14 coaches were misfiled once already by a literal comparison on this field.
    expect(canSeeProspectRanking({ role: "college-coach" })).toBe(true)
    expect(canSeeProspectRanking({ role: "college_coach" })).toBe(true)
  })
})

describe("one entitlement for everything sold", () => {
  it("gives a Blue member the analytics a subscriber gets", () => {
    /*
     * The bug this pins: coach views checked the paid subscription alone, so a Blue family
     * could not see which colleges had viewed their own child while a $9.99 subscriber could.
     */
    expect(hasPremiumAccess({ isBlueMember: true })).toBe(true)
    expect(hasPremiumAccess({ hasSubscription: true })).toBe(true)
  })

  it("gives a verified college coach access without paying", () => {
    expect(hasPremiumAccess({ isVerifiedCoach: true })).toBe(true)
    expect(hasPremiumAccess({ role: "college-coach" })).toBe(true)
  })

  it("gives a free account nothing", () => {
    // They can still view profiles and edit their own; neither goes through this gate.
    expect(hasPremiumAccess({ isBlueMember: false, hasSubscription: false })).toBe(false)
    expect(hasPremiumAccess(null)).toBe(false)
  })

  it("does not let owning a profile unlock the whole platform", () => {
    // A wrestler seeing their own ranking is a separate allowance, in canSeeProspectRanking.
    expect(hasPremiumAccess({ isOwnProfile: true })).toBe(false)
    expect(canSeeProspectRanking({ isOwnProfile: true })).toBe(true)
  })
})
