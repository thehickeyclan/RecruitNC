import { describe, expect, it } from "vitest"
import { formatAthleteProfileDetailsMarkdown } from "./data-dawg-athlete-profile-details"

describe("formatAthleteProfileDetailsMarkdown", () => {
  it("includes public competitive fields from an athlete profile", () => {
    const markdown = formatAthleteProfileDetailsMarkdown({
      college_opens_experience: "2025 App State Open: 2nd place",
      nationally_ranked_wins: "Beat a nationally ranked opponent",
      additional_achievements: "2025 Ironman All-American",
      achievements: ["Team captain"],
      gpa: 4.0,
      phone: "555-555-5555",
    })

    expect(markdown).toContain("Athlete profile details (profile-reported)")
    expect(markdown).toContain("2025 App State Open: 2nd place")
    expect(markdown).toContain("Beat a nationally ranked opponent")
    expect(markdown).toContain("2025 Ironman All-American")
    expect(markdown).toContain("Team captain")
    expect(markdown).not.toContain("4.0")
    expect(markdown).not.toContain("555-555-5555")
  })

  it("returns an empty string when no supported public details exist", () => {
    expect(formatAthleteProfileDetailsMarkdown({ gpa: 3.8 })).toBe("")
  })
})
