import { describe, expect, it } from "vitest"
import { HUMAN_VERIFIED_METHOD, releasesPersonalData, scoutingAccessTier, scoutingReportAvailable, watermarkLine } from "@/lib/scouting-report-access"

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

  it("withholds them from a coach auto-approved on a .edu address alone", () => {
    // A .edu address proves affiliation with an institution, not that somebody coaches —
    // students and alumni hold one for life. Not enough for a portable dossier on a minor.
    expect(scoutingAccessTier({ ...coach, verifiedMethod: "edu_auto" })).toBe("intelligence")
  })

  it("withholds them when the coach was never verified at all", () => {
    expect(scoutingAccessTier({ ...coach, verifiedCoach: false })).toBe("intelligence")
  })

  it("withholds them when no verification method was recorded", () => {
    // 33 of 36 existing coaches predate the audit columns. Absent evidence is not consent.
    expect(scoutingAccessTier({ ...coach, verifiedMethod: null })).toBe("intelligence")
    expect(scoutingAccessTier({ ...coach, verifiedMethod: undefined })).toBe("intelligence")
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
