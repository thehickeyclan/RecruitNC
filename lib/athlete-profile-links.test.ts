import { describe, expect, it } from "vitest"
import { formatAthleteAnswerOpening, getAthleteProfileUrl } from "@/lib/athlete-profile-links"

describe("getAthleteProfileUrl", () => {
  it("uses the public /view-profile?id= route", () => {
    const id = "11111111-1111-1111-1111-111111111111"
    expect(getAthleteProfileUrl(id)).toBe(
      `https://app.ncwrestlingunited.com/view-profile?id=${encodeURIComponent(id)}`,
    )
    expect(getAthleteProfileUrl(id)).not.toContain("/unified-profile/")
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
    })
    expect(lines[0]).toBe(`Here's what I found about [Anna Ockerman](${getAthleteProfileUrl(id)}):`)
    expect(lines[0]).toContain("/view-profile?id=")
    expect(lines).toContain("High School: Green Level")
    expect(lines).toContain("Class of: 2026")
    expect(lines).toContain("College commit: Roanoke (NCAA Division III)")
    expect(lines.some((l) => l.startsWith("Profile:"))).toBe(false)
  })

  it("omits Profile-style opener when there is no id or url", () => {
    const lines = formatAthleteAnswerOpening("Historical Alumni", null)
    expect(lines[0]).toBe("Here's what I found about Historical Alumni:")
    expect(lines.some((l) => l.includes("]("))).toBe(false)
  })
})
