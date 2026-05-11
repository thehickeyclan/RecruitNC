import { describe, expect, it } from "vitest"
import { plausibleNchsaaYearsForGradYear } from "@/lib/nchsaa-plausible-years"
import { filterNchsaaRowsBySchoolOptional } from "@/lib/nchsaa-results"

describe("plausibleNchsaaYearsForGradYear", () => {
  it("class of 2028 excludes early years that belong to a different same-name athlete", () => {
    const { min, max } = plausibleNchsaaYearsForGradYear(2028)
    expect(min).toBe(2024)
    expect(max).toBe(2032)
    expect(min).toBeGreaterThan(2023)
  })

  it("keeps a four-year window below grad year for seniors", () => {
    const { min } = plausibleNchsaaYearsForGradYear(2027)
    expect(min).toBe(2023)
  })
})

describe("filterNchsaaRowsBySchoolOptional", () => {
  const rows = [
    {
      year: 2026,
      classification: "7A",
      weight_class: "150",
      place: 4 as number | null,
      school: "New Bern High School",
      wrestler_name: "Perry, Jacob",
    },
    {
      year: 2023,
      classification: "3A",
      weight_class: "138",
      place: 5 as number | null,
      school: "Some Other School",
      wrestler_name: "Perry, Jacob",
    },
  ]

  it("keeps only rows that match the profile school when at least one matches", () => {
    const out = filterNchsaaRowsBySchoolOptional(rows, "New Bern")
    expect(out).toHaveLength(1)
    expect(out[0]!.year).toBe(2026)
  })

  it("returns all rows when no school hint", () => {
    expect(filterNchsaaRowsBySchoolOptional(rows, undefined)).toEqual(rows)
  })

  it("falls back to all rows when no row school matches (table typo vs profile)", () => {
    const out = filterNchsaaRowsBySchoolOptional(rows, "Fake Academy")
    expect(out).toEqual(rows)
  })
})
