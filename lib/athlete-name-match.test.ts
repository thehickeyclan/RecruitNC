import { describe, expect, it } from "vitest"
import {
  filterRowsByAthleteMatchContext,
  getAthleteNameSearchVariants,
  namesLikelySamePerson,
  namesReferToSamePerson,
  pickBestAthleteCandidate,
  scoreAthleteRowMatch,
} from "@/lib/athlete-name-match"

describe("athlete-name-match", () => {
  it("treats Max Davis and Maxwell Davis as likely same person", () => {
    expect(namesLikelySamePerson("Max Davis", "Maxwell Davis")).toBe(true)
    expect(namesLikelySamePerson("Maxwell Davis", "Max Davis")).toBe(true)
  })

  it("expands Max to Maxwell in search variants", () => {
    const variants = getAthleteNameSearchVariants("Max Davis")
    expect(variants.some((v) => v.toLowerCase().includes("maxwell"))).toBe(true)
  })

  it("matches Last, First token order", () => {
    expect(namesReferToSamePerson("Ryan Thompson", "Thompson, Ryan")).toBe(true)
  })

  it("scores Maxwell NCHSAA row higher for Max Davis profile with school + grad", () => {
    const maxwellScore = scoreAthleteRowMatch(
      { displayName: "Max Davis", graduationYear: 2026, highSchool: "Jacksonville" },
      { name: "Maxwell Davis", school: "Jacksonville", year: 2026 },
    )
    const wrongScore = scoreAthleteRowMatch(
      { displayName: "Max Davis", graduationYear: 2026, highSchool: "Jacksonville" },
      { name: "Max Smith", school: "Charlotte", year: 2020 },
    )
    expect(maxwellScore).toBeGreaterThan(wrongScore)
    expect(maxwellScore).toBeGreaterThanOrEqual(35)
  })

  it("filters wrong namesakes when strong match exists", () => {
    const rows = [
      { name: "Maxwell Davis", school: "Jacksonville", year: 2026, place: 1 },
      { name: "Max Davis", school: "Raleigh", year: 2019, place: 3 },
    ]
    const filtered = filterRowsByAthleteMatchContext(
      rows,
      { displayName: "Max Davis", graduationYear: 2026, highSchool: "Jacksonville" },
      (r) => r,
    )
    expect(filtered).toHaveLength(1)
    expect(filtered[0].name).toBe("Maxwell Davis")
  })

  it("pickBestAthleteCandidate chooses grad + school match", () => {
    const candidates = [
      { id: "a", name: "Matthew Hickey", highschool: "Northwest Guilford", graduationyear: 2027 },
      { id: "b", name: "Matt Hickey", highschool: "Other HS", graduationyear: 2024 },
    ]
    const picked = pickBestAthleteCandidate(
      candidates,
      { displayName: "Matt Hickey", graduationYear: 2027, highSchool: "Northwest Guilford" },
      (r) => ({
        name: r.name,
        highSchool: r.highschool,
        graduationYear: r.graduationyear,
      }),
    )
    expect(picked?.id).toBe("a")
  })
})
