import { describe, expect, it } from "vitest"
import {
  buildAthleteTimelineEvents,
  formatAthleteTimelineMarkdown,
  hsClassLabelForYear,
} from "./data-dawg-athlete-timeline"

describe("hsClassLabelForYear", () => {
  it("maps tournament year to Freshman–Senior from grad year", () => {
    expect(hsClassLabelForYear(2026, 2023)).toBe("Freshman")
    expect(hsClassLabelForYear(2026, 2024)).toBe("Sophomore")
    expect(hsClassLabelForYear(2026, 2025)).toBe("Junior")
    expect(hsClassLabelForYear(2026, 2026)).toBe("Senior")
  })

  it("does not invent labels outside the HS window", () => {
    expect(hsClassLabelForYear(2026, 2022)).toBeNull()
    expect(hsClassLabelForYear(2026, 2027)).toBeNull()
    expect(hsClassLabelForYear(null, 2024)).toBeNull()
  })
})

describe("buildAthleteTimelineEvents", () => {
  it("orders chronologically and groups State → nationals → commit", () => {
    const events = buildAthleteTimelineEvents({
      graduationYear: 2026,
      nchsaa: [
        {
          year: 2026,
          classification: "4A",
          weight_class: "150lbs",
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
      ],
      super32: [
        {
          year: 2024,
          placement: "5th",
          record: "",
          weight: "132",
        },
      ],
      commit: { college: "Appalachian State", division: "D1", year: 2026 },
    })

    expect(events.map((e) => e.year)).toEqual([2023, 2024, 2026, 2026])
    expect(events[0].label).toContain("State Champion")
    expect(events[1].label).toContain("Super32")
    expect(events[events.length - 1].label).toContain("Committed to Appalachian State")
  })

  it("skips thin Participated national rows and NCHSAA non-placers", () => {
    const events = buildAthleteTimelineEvents({
      nchsaa: [
        {
          year: 2022,
          classification: "4A",
          weight_class: "113",
          place: 0,
          school: "X",
          wrestler_name: "Y",
        },
      ],
      nhsca: [{ year: 2022, placement: "Participated", record: "", weight: "120" }],
    })
    expect(events).toHaveLength(0)
  })
})

describe("formatAthleteTimelineMarkdown", () => {
  it("renders year blocks with class labels and ↓ separators", () => {
    const md = formatAthleteTimelineMarkdown(
      [
        { year: 2023, kind: "nchsaa", label: "NCHSAA State Champion (3A, 120lbs)", priority: 10 },
        { year: 2024, kind: "super32", label: "Super32 5th All-American (132lbs)", priority: 40 },
        { year: 2026, kind: "nchsaa", label: "NCHSAA State Champion (4A, 150lbs)", priority: 10 },
        { year: 2026, kind: "commit", label: "Committed to Appalachian State (D1)", priority: 90 },
      ],
      2026,
    )

    expect(md).toContain("Career timeline:")
    expect(md).toContain("**2023 · Freshman**")
    expect(md).toContain("**2024 · Sophomore**")
    expect(md).toContain("**2026 · Senior**")
    expect(md).toContain("↓")
    expect(md).toContain("Committed to Appalachian State")
    // Two events share 2026 block
    expect(md.indexOf("**2026 · Senior**")).toBeLessThan(md.indexOf("Committed to Appalachian State"))
  })
})
