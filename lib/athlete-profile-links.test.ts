import { describe, expect, it } from "vitest"
import {
  buildBriefAthleteCareerSummary,
  formatAthleteAnswerOpening,
  getAthleteProfileUrl,
} from "@/lib/athlete-profile-links"

describe("getAthleteProfileUrl", () => {
  it("uses the public /view-profile?id= route", () => {
    const id = "11111111-1111-1111-1111-111111111111"
    expect(getAthleteProfileUrl(id)).toBe(
      `https://app.ncwrestlingunited.com/view-profile?id=${encodeURIComponent(id)}`,
    )
    expect(getAthleteProfileUrl(id)).not.toContain("/unified-profile/")
  })
})

describe("buildBriefAthleteCareerSummary", () => {
  it("combines state titles and career record", () => {
    expect(
      buildBriefAthleteCareerSummary({ stateTitleYears: 3, careerWins: 193, careerLosses: 9 }),
    ).toBe("3× State Champion with a 193-9 high school career.")
  })
})

describe("formatAthleteAnswerOpening", () => {
  it("makes the athlete name the profile hyperlink and puts summary fields on top", () => {
    const id = "11111111-1111-1111-1111-111111111111"
    const lines = formatAthleteAnswerOpening("Anna Ockerman", id, null, {
      highSchool: "Green Level",
      graduationYear: 2026,
      college: "Roanoke",
      division: "NCAA Division III",
      weightClass: "138",
      careerSummary: "3× State Champion with a 193-9 high school career.",
    })
    expect(lines[0]).toBe(`Here's what I found about [Anna Ockerman](${getAthleteProfileUrl(id)}):`)
    expect(lines[0]).toContain("/view-profile?id=")
    expect(lines).toContain("High School: Green Level")
    expect(lines).toContain("Class of: 2026")
    expect(lines).toContain("College: Roanoke (NCAA Division III)")
    expect(lines).toContain("3× State Champion with a 193-9 high school career.")
    expect(lines.some((l) => l.startsWith("Weight:"))).toBe(false)
    expect(lines.some((l) => l.startsWith("Profile:"))).toBe(false)
  })

  it("puts the original school first when there was a transfer", () => {
    const lines = formatAthleteAnswerOpening("Liam Hickey", "ed26dd22-9533-4acf-ade7-577b41b03337", null, {
      college: "NC State",
      previousCollege: "UNC Chapel Hill",
    })
    expect(lines).toContain("College career: UNC Chapel Hill → NC State")
  })

  it("omits Profile-style opener when there is no id or url", () => {
    const lines = formatAthleteAnswerOpening("Historical Alumni", null)
    expect(lines[0]).toBe("Here's what I found about Historical Alumni:")
    expect(lines.some((l) => l.includes("]("))).toBe(false)
  })
})
