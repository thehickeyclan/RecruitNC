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
    expect(hsClassLabelForYear(null, 2024)).toBeNull()
  })
})

describe("buildAthleteTimelineEvents progression", () => {
  it("labels state titles with First / Repeat / Third / Fourth momentum", () => {
    const events = buildAthleteTimelineEvents({
      graduationYear: 2026,
      nchsaa: [
        {
          year: 2023,
          classification: "3A",
          weight_class: "120lbs",
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
          year: 2025,
          classification: "3A",
          weight_class: "144lbs",
          place: 1,
          school: "Stuart Cramer",
          wrestler_name: "Bentley Sly",
        },
        {
          year: 2026,
          classification: "4A",
          weight_class: "150lbs",
          place: 1,
          school: "Stuart Cramer",
          wrestler_name: "Bentley Sly",
        },
      ],
      nhsca: [
        { year: 2024, placement: "6th", record: "", weight: "132" },
        { year: 2026, placement: "2nd", record: "", weight: "150" },
      ],
      commit: { college: "Appalachian State", division: "D1", year: 2026 },
    })

    const labels = events.map((e) => e.label)
    expect(labels.some((l) => l.includes("First State Championship"))).toBe(true)
    expect(labels.some((l) => l.includes("Repeated as State Champion") || l.includes("Repeat State Champion"))).toBe(true)
    expect(labels.some((l) => l.includes("Third State Title"))).toBe(true)
    expect(labels.some((l) => l.includes("Fourth State Title"))).toBe(true)
    expect(labels.some((l) => l.includes("First NHSCA All-American"))).toBe(true)
    expect(labels.some((l) => l.includes("Runner-up"))).toBe(true)
    expect(labels.some((l) => l.includes("🎓 Appalachian State") || l.includes("🤼 Appalachian State"))).toBe(true)
  })

  it("skips thin Participated rows", () => {
    const events = buildAthleteTimelineEvents({
      nhsca: [{ year: 2022, placement: "Participated", record: "", weight: "120" }],
    })
    expect(events).toHaveLength(0)
  })

  it("does not infer Blood Round from wins alone", () => {
    const events = buildAthleteTimelineEvents({
      fargo: [{ year: 2024, placement: "", record: "6-2", weight: "144", division: "16U" }],
    })
    expect(events.some((e) => /6–2/.test(e.label))).toBe(true)
    expect(events.some((e) => /Blood Round/i.test(e.label))).toBe(false)
  })
})

describe("formatAthleteTimelineMarkdown", () => {
  it("renders year blocks with ↓ separators", () => {
    const md = formatAthleteTimelineMarkdown(
      [
        { year: 2023, kind: "nchsaa", label: "🏆 First State Championship (3A, 120lbs)", priority: 10 },
        { year: 2024, kind: "nhsca", label: "🥉 First NHSCA All-American", priority: 30 },
        { year: 2026, kind: "nchsaa", label: "🏆 Fourth State Title (4A, 150lbs)", priority: 10 },
        { year: 2026, kind: "commit", label: "🤼 Appalachian State (D1)", priority: 90 },
      ],
      2026,
    )
    expect(md).toContain("Career progression:")
    expect(md).toContain("**2023 · Freshman**")
    expect(md).toContain("↓")
    expect(md).toContain("Fourth State Title")
  })

  it("puts season record at the top of each year block", () => {
    const md = formatAthleteTimelineMarkdown(
      buildAthleteTimelineEvents({
        graduationYear: 2025,
        nchsaa: [
          {
            year: 2025,
            classification: "4A",
            weight_class: "138lbs",
            place: 1,
            school: "Cardinal Gibbons",
            wrestler_name: "Liam Hickey",
          },
        ],
        awards: [{ year: 2025, label: "Dave Schultz High School Excellence Award" }],
        seasonRecords: [{ year: 2025, wins: 36, losses: 0, classLabel: "Senior" }],
      }),
      2025,
    )
    const afterHeader = md.split("**2025 · Senior**\n")[1] ?? ""
    expect(afterHeader.startsWith("36–0\n")).toBe(true)
  })
})
