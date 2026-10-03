import { describe, expect, it } from "vitest"
import { type ScoutingViewer, HUMAN_VERIFIED_METHOD, releasesPersonalData, scoutingAccessTier, scoutingReportAvailable, watermarkLine } from "@/lib/scouting-report-access"

const coach = {
  isCollegeCoach: true,
  isAdmin: false,
  verifiedCoach: true,
  verifiedMethod: HUMAN_VERIFIED_METHOD,
}

describe("scoutingAccessTier", () => {
  it("releases contact and academics to a coach checked against a staff directory", () => {
    expect(scoutingAccessTier(coach)).toBe("full")
  })

  it("releases them however the coach was verified", () => {
    // Access first, reviewed after. Demanding a second human-confirmed method on top meant a
    // coach who signed up and opened a report got one with no phone number and no GPA - while
    // reading both on the profile page, one click away. The gate protected nothing and made the
    // page and the report disagree about the same wrestler.
    for (const method of ["edu_auto", "coach_signup_form", null, undefined]) {
      expect(scoutingAccessTier({ ...coach, verifiedMethod: method })).toBe("full")
    }
  })

  it("withholds them when the coach was never verified at all", () => {
    // Rejecting a coach clears verified_coach, which closes the report and the rankings together.
    expect(scoutingAccessTier({ ...coach, verifiedCoach: false })).toBe("intelligence")
  })

  it("gives a non-coach the intelligence tier even if somehow marked verified", () => {
    expect(scoutingAccessTier({ ...coach, isCollegeCoach: false })).toBe("intelligence")
  })

  it("gives admins the full set — they administer the data already", () => {
    expect(
      scoutingAccessTier({ isCollegeCoach: false, isAdmin: true, verifiedCoach: false, verifiedMethod: null }),
    ).toBe("full")
  })
})

describe("releasesPersonalData", () => {
  it("is true only for the full tier", () => {
    expect(releasesPersonalData("full")).toBe(true)
    expect(releasesPersonalData("intelligence")).toBe(false)
  })
})

describe("watermarkLine", () => {
  it("names the coach and their program", () => {
    expect(watermarkLine({ name: "Pat Rivera", institution: "State University" })).toBe(
      "Prepared for Pat Rivera · State University",
    )
  })

  it("falls back to the email when no name is on file", () => {
    expect(watermarkLine({ email: "coach@state.edu" })).toBe("Prepared for coach@state.edu")
  })

  it("still identifies the copy when nothing is known", () => {
    expect(watermarkLine({})).toBe("Prepared for Verified coach")
  })
})

describe("scoutingReportAvailable", () => {
  it("holds female wrestlers back while their results are thin in our data", () => {
    // Coverage, not judgement: 3 of 30 on national competition against 8 for the boys, and six
    // female athletes with signed college commitments scoring zero.
    expect(scoutingReportAvailable({ gender: "Female" })).toBe(false)
    expect(scoutingReportAvailable({ gender: "female" })).toBe(false)
    expect(scoutingReportAvailable({ gender: " FEMALE " })).toBe(false)
  })

  it("keeps the report for everybody else", () => {
    expect(scoutingReportAvailable({ gender: "Male" })).toBe(true)
  })

  it("does not widen into athletes with no gender recorded", () => {
    // The hold-back names a group we can identify; it must not quietly swallow the unknowns.
    expect(scoutingReportAvailable({ gender: null })).toBe(true)
    expect(scoutingReportAvailable({ gender: "" })).toBe(true)
    expect(scoutingReportAvailable({})).toBe(true)
  })
})

describe("what a non-coach never sees on a report", () => {
  /*
   * The rule, pinned: outside admins and verified college coaches, nobody reaches a wrestler's
   * cell, email, GPA, SAT, ACT, intended major - or our star rating, which is an assessment of
   * a child rather than a fact about them.
   */
  it("withholds personal data from everyone except an admin or a human-verified coach", () => {
    const viewer = (over: Partial<ScoutingViewer> = {}): ScoutingViewer => ({
      isCollegeCoach: false,
      isAdmin: false,
      verifiedCoach: false,
      ...over,
    })
    expect(releasesPersonalData(scoutingAccessTier(viewer({ isAdmin: true })))).toBe(true)
    expect(
      releasesPersonalData(
        scoutingAccessTier(
          viewer({ isCollegeCoach: true, verifiedCoach: true, verifiedMethod: HUMAN_VERIFIED_METHOD }),
        ),
      ),
    ).toBe(true)

    // Verified on sign-up is enough: access first, reviewed after. A coach reads the same cell,
    // email and GPA on the profile page, so withholding them from the report protected nothing.
    expect(
      releasesPersonalData(
        scoutingAccessTier(viewer({ isCollegeCoach: true, verifiedCoach: true, verifiedMethod: "coach_signup_form" })),
      ),
    ).toBe(true)

    // Nobody else: not a signed-in stranger, and not a coach whose verification was withdrawn.
    expect(releasesPersonalData(scoutingAccessTier(viewer()))).toBe(false)
    expect(releasesPersonalData(scoutingAccessTier(viewer({ isCollegeCoach: true })))).toBe(false)
  })
})

describe("graduated classes have no scouting report", () => {
  const sept2026 = new Date("2026-09-27T12:00:00Z")

  it("withholds a report from a class that has already graduated", () => {
    // 2025 and 2026 are wrestling in college; the recruiting decision is made.
    expect(scoutingReportAvailable({ gender: "Male", graduationyear: 2025 }, sept2026)).toBe(false)
    expect(scoutingReportAvailable({ gender: "Male", graduationyear: 2026 }, sept2026)).toBe(false)
  })

  it("keeps it for classes still in high school", () => {
    for (const year of [2027, 2028, 2029, 2030]) {
      expect(scoutingReportAvailable({ gender: "Male", graduationyear: year }, sept2026)).toBe(true)
    }
  })

  it("moves on its own each summer rather than needing a list", () => {
    // Before July the current seniors are still in school and still recruitable.
    expect(scoutingReportAvailable({ gender: "Male", graduationyear: 2027 }, new Date("2027-02-21T12:00:00Z"))).toBe(true)
    expect(scoutingReportAvailable({ gender: "Male", graduationyear: 2027 }, new Date("2027-08-01T12:00:00Z"))).toBe(false)
  })

  it("still allows one whose graduation year we do not hold", () => {
    expect(scoutingReportAvailable({ gender: "Male" }, sept2026)).toBe(true)
  })
})
