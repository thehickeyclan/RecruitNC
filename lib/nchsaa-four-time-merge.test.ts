import { describe, expect, it } from "vitest"
import { mergeCuratedFourTimeNchsaaIfMatch } from "@/lib/nchsaa-results"

describe("mergeCuratedFourTimeNchsaaIfMatch", () => {
  it("adds missing 2026 title for Bentley Sly from curated list", () => {
    const partial = [
      {
        year: 2025,
        classification: "3A",
        weight_class: "144lbs",
        place: 1,
        school: "Stuart Cramer",
        wrestler_name: "Bentley Sly",
      },
      {
        year: 2024,
        classification: "3A",
        weight_class: "132lbs",
        place: 1,
        school: "Stuart Cramer",
        wrestler_name: "Bentley Sly",
      },
      {
        year: 2023,
        classification: "3A",
        weight_class: "120lbs",
        place: 1,
        school: "Stuart Cramer",
        wrestler_name: "Bentley Sly",
      },
    ]
    const merged = mergeCuratedFourTimeNchsaaIfMatch(partial, "Bentley Sly")
    const champYears = merged.filter((r) => r.place === 1).map((r) => r.year).sort()
    expect(champYears).toEqual([2023, 2024, 2025, 2026])
  })

  it("matches Lorenzo Alston when display name is Last, First", () => {
    const partial = [
      { year: 2026, classification: "4A", weight_class: "175lbs", place: 1, school: "Uwharrie Charter", wrestler_name: "Alston, Lorenzo" },
      { year: 2025, classification: "1A", weight_class: "157lbs", place: 1, school: "Uwharrie Charter", wrestler_name: "Alston, Lorenzo" },
      { year: 2023, classification: "1A", weight_class: "145lbs", place: 1, school: "Uwharrie Charter", wrestler_name: "Alston, Lorenzo" },
    ]
    const merged = mergeCuratedFourTimeNchsaaIfMatch(partial, "Alston, Lorenzo")
    const champYears = merged.filter((r) => r.place === 1).map((r) => r.year).sort()
    expect(champYears).toEqual([2023, 2024, 2025, 2026])
  })

  it("does not alter non-four-time wrestlers", () => {
    const rows = [
      { year: 2026, classification: "7A", weight_class: "150lbs", place: 1, school: "Davie", wrestler_name: "Andrew Davis" },
    ]
    const merged = mergeCuratedFourTimeNchsaaIfMatch(rows, "Andrew Davis")
    expect(merged).toEqual(rows)
  })
})
