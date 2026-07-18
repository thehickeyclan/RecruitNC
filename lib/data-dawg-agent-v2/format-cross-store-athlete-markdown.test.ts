import { describe, expect, it } from "vitest"
import {
  crossStoreHasUsefulHits,
  formatCrossStoreAthleteMarkdown,
} from "./format-cross-store-athlete-markdown"

describe("formatCrossStoreAthleteMarkdown", () => {
  it("formats Brandon Palmer-style NCHSAA alumni hits", () => {
    const md = formatCrossStoreAthleteMarkdown("Brandon Palmer", {
      nchsaa_state: [
        {
          wrestler_name: "Brandon Palmer",
          place: 1,
          year: 2002,
          classification: "4A",
          weight_class: "125",
          school: "Riverside-Durham",
        },
        {
          wrestler_name: "Brandon Palmer",
          place: 1,
          year: 2001,
          classification: "4A",
          weight_class: "125",
          school: "Riverside-Durham",
        },
      ],
      total_hits: 2,
    })
    expect(md).toContain("Brandon Palmer")
    expect(md).toContain("Riverside-Durham")
    expect(md).toContain("2002")
    expect(md).toContain("1st place")
    expect(md).not.toContain("feel free to ask")
  })

  it("detects useful hits", () => {
    expect(crossStoreHasUsefulHits({ total_hits: 2 })).toBe(true)
    expect(crossStoreHasUsefulHits({ nchsaa_state: [{ year: 2001 }] })).toBe(true)
    expect(crossStoreHasUsefulHits({})).toBe(false)
  })

  it("shows state qualifiers instead of blank or generic competed labels", () => {
    const md = formatCrossStoreAthleteMarkdown("Spencer Moore", {
      nchsaa_state: [
        { wrestler_name: "Spencer Moore", place: null, year: 2025, classification: "2A", weight_class: "144", school: "Wheatmore" },
        { wrestler_name: "Spencer Moore", place: 0, year: 2026, classification: "3A", weight_class: "150", school: "Wheatmore" },
      ],
    })
    expect(md).toContain("2025: State qualifier (2A, 144)")
    expect(md).toContain("2026: State qualifier (3A, 150)")
  })

  it("includes a historical athlete's college commitment", () => {
    const md = formatCrossStoreAthleteMarkdown("Cam Stinson", {
      nchsaa_state: [{ wrestler_name: "Cameron Stinson", place: 1, year: 2024, school: "Mallard Creek" }],
      college_commits: [
        {
          athlete_name: "Cameron Stinson",
          graduation_year: 2024,
          college: "UNC Chapel Hill",
          level: "NCAA Division I",
        },
      ],
    })
    expect(md).toContain("College: UNC Chapel Hill (NCAA Division I)")
    expect(md).toContain("Class of: 2024")
  })

  it("leads a historical answer with why the athlete matters", () => {
    const md = formatCrossStoreAthleteMarkdown("cam stinson", {
      nchsaa_state: [2021, 2022, 2023, 2024].map((year) => ({
        wrestler_name: "Cameron Stinson",
        place: 1,
        year,
        school: "Mallard Creek",
      })),
      nhsca_placements: [
        { athlete_name: "Cameron Stinson", placement: 1, year: 2022, high_school: "Mallard Creek" },
      ],
      college_commits: [
        { athlete_name: "Cameron Stinson", graduation_year: 2024, college: "UNC Chapel Hill", level: "NCAA Division I" },
      ],
    })
    expect(md).toContain(
      "Cameron Stinson is a four-time NCHSAA state champion and a 2022 NHSCA national champion from Mallard Creek.",
    )
    expect(md).toContain("Class of 2024, Cameron Stinson continued to UNC Chapel Hill (NCAA Division I).")
    expect(md.indexOf("four-time NCHSAA")).toBeLessThan(md.indexOf("Career progression:"))
  })
})
