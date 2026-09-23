import { describe, expect, it } from "vitest"
import { alreadyAnswered, decideCompleteProfile } from "./complete-profile"

const decide = (requestedType: string, email: string, existingRole: string | null = null) =>
  decideCompleteProfile({ requestedType, email, existingRole })

describe("decideCompleteProfile", () => {
  it("auto-approves a college coach on a .edu address", () => {
    expect(decide("college-coach", "coach@ncsu.edu")).toEqual({
      ok: true,
      role: "college_coach",
      verifiedCoach: true,
      redirectTo: "/athletes",
    })
  })

  it("makes a college coach on a personal address wait for a human", () => {
    expect(decide("college-coach", "coach@gmail.com")).toEqual({
      ok: true,
      role: "college_coach",
      verifiedCoach: false,
      redirectTo: "/auth/coach-pending",
    })
  })

  it("writes the spelling the admin approval queue actually reads", () => {
    // The picker says "college-coach"; the queue counts "college_coach". They must not diverge
    // again — four real coaches were invisible for as long as they did.
    expect(decide("college-coach", "coach@ncsu.edu")).toMatchObject({ role: "college_coach" })
  })

  it("gives a .edu address nothing on any other role", () => {
    expect(decide("athlete", "kid@ncsu.edu")).toEqual({
      ok: true,
      role: "athlete",
      verifiedCoach: false,
      redirectTo: "/",
    })
    expect(decide("hs-club-coach", "coach@ncsu.edu")).toMatchObject({ verifiedCoach: false })
  })

  it("refuses to re-role an account that already answered", () => {
    // The takeover this prevents: an existing athlete on a .edu address declaring itself a coach.
    expect(decide("college-coach", "kid@ncsu.edu", "athlete")).toMatchObject({ ok: false, status: 409 })
    expect(decide("college-coach", "kid@ncsu.edu", "hs-club-coach")).toMatchObject({ ok: false, status: 409 })
  })

  it("still asks accounts holding only a default role", () => {
    // Google sign-ups land as `user`; nobody chose that, so it is not an answer.
    expect(decide("college-coach", "coach@ncsu.edu", "user")).toMatchObject({ ok: true })
    expect(decide("athlete", "kid@gmail.com", "fan")).toMatchObject({ ok: true })
  })

  it("refuses a role that is not on the picker", () => {
    expect(decide("admin", "someone@ncsu.edu")).toMatchObject({ ok: false, status: 400 })
    expect(decide("", "someone@ncsu.edu")).toMatchObject({ ok: false, status: 400 })
  })
})

describe("alreadyAnswered", () => {
  it("treats the defaults as unanswered", () => {
    expect(alreadyAnswered(null)).toBe(false)
    expect(alreadyAnswered("")).toBe(false)
    expect(alreadyAnswered("user")).toBe(false)
    expect(alreadyAnswered("fan")).toBe(false)
    expect(alreadyAnswered("athlete")).toBe(true)
    expect(alreadyAnswered("college_coach")).toBe(true)
  })
})
