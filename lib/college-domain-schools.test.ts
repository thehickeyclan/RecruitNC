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
  it("gives one school one label, so the views panel cannot count it twice", () => {
    // Two coaches at the same school who disagree about its name used to become two rows on
    // the athlete's panel. A mapped domain wins over whatever either of them typed.
    expect(collegeForCoach({ institution: "Washington and Lee University", email: "a@wlu.edu" })).toBe(
      "Washington & Lee",
    )
    expect(collegeForCoach({ institution: "", email: "b@wlu.edu" })).toBe("Washington & Lee")
    expect(collegeForCoach({ institution: "Wesleyan University", email: "a@wesleyan.edu" })).toBe(
      "Wesleyan University (CT)",
    )
  })

  it("still uses a stated institution where the domain tells us nothing", () => {
    // A coach on a personal address, or at a school not yet in the table.
    expect(collegeForCoach({ institution: "Hunter College", email: "coach@gmail.com" })).toBe(
      "Hunter College",
    )
    expect(collegeForCoach({ institution: "Pacific University", email: "coach@pacificu.edu" })).toBe(
      "Pacific University",
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
    // bac.edu is Belmont Abbey College. It was mapped to Bluefield, and three Belmont Abbey
    // coaches had typed their school in, which hid the wrong name until the domain started winning.
    expect(collegeForCoach({ email: "coach@bac.edu" })).toBe("Belmont Abbey")
    expect(collegeForCoach({ institution: "Belmont Abbey College", email: "coach@bac.edu" })).toBe(
      "Belmont Abbey",
    )
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
