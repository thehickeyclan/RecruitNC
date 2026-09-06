import { describe, expect, it } from "vitest"
import { collegeForCoach, emailDomain } from "@/lib/college-domain-schools"

describe("emailDomain", () => {
  it("reads the domain", () => {
    expect(emailDomain("coach@roanoke.edu")).toBe("roanoke.edu")
    expect(emailDomain("Coach@Roanoke.EDU")).toBe("roanoke.edu")
  })

  it("is null on junk", () => {
    expect(emailDomain("not-an-email")).toBeNull()
    expect(emailDomain("")).toBeNull()
    expect(emailDomain(null)).toBeNull()
  })
})

describe("collegeForCoach", () => {
  it("prefers a stated institution — somebody typed that deliberately", () => {
    expect(collegeForCoach({ institution: "Roanoke College", email: "x@campbell.edu" })).toBe(
      "Roanoke College",
    )
  })

  it("uses the mapped name for domains we know", () => {
    expect(collegeForCoach({ email: "coach@campbell.edu" })).toBe("Campbell University")
    expect(collegeForCoach({ email: "coach@roanoke.edu" })).toBe("Roanoke College")
  })

  it("falls back to the domain label for a school not yet mapped", () => {
    // New coach domains appear over time; the fallback has to be reasonable, not blank.
    expect(collegeForCoach({ email: "coach@stanford.edu" })).toBe("Stanford")
    expect(collegeForCoach({ email: "coach@mars-hill.edu" })).toBe("Mars Hill")
  })

  it("spells out the abbreviations that do not read as a school", () => {
    // "Umo" would mean nothing to a family; the point is to name a program they recognise.
    expect(collegeForCoach({ email: "coach@umo.edu" })).toBe("University of Mount Olive")
    expect(collegeForCoach({ email: "coach@bac.edu" })).toBe("Bluefield College")
  })

  it("handles a subdomain", () => {
    expect(collegeForCoach({ email: "coach@athletics.stanford.edu" })).toBe("Stanford")
  })

  it("returns null rather than guessing from a personal address", () => {
    // A wrong school on a recruiting notification is worse than a vague one.
    expect(collegeForCoach({ email: "coach@gmail.com" })).toBeNull()
    expect(collegeForCoach({ email: null })).toBeNull()
    expect(collegeForCoach({})).toBeNull()
  })
})
