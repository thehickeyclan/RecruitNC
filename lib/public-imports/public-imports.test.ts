import { describe, expect, it } from "vitest"
import { diffDualTeamRows, diffPlacerRows, summarizeDiffs } from "./diff"
import { namesLooselyEqual, schoolsLooselyEqual } from "./normalize"
import {
  parseDualTeamPayload,
  parseNchsaaGuaranteedPlacesText,
  parsePlacerJsonPayload,
} from "./parse"

describe("public-imports normalize", () => {
  it("matches Last, First ↔ First Last", () => {
    expect(namesLooselyEqual("Ockerman, Anna", "Anna Ockerman")).toBe(true)
    expect(schoolsLooselyEqual("Seaforth High School", "Seaforth")).toBe(true)
  })
})

describe("public-imports parse", () => {
  it("parses dual export records", () => {
    const rows = parseDualTeamPayload({
      records: [
        { year: 2025, division: "4A", champion_school: "Cardinal Gibbons", held: true },
      ],
    })
    expect(rows).toEqual([
      expect.objectContaining({
        year: 2025,
        division: "4A",
        champion_school: "Cardinal Gibbons",
      }),
    ])
  })

  it("expands verified school leaderboard into year rows", () => {
    const rows = parseDualTeamPayload({
      schools: [
        {
          champion_school: "Trinity",
          years: [2024],
          divisions: ["2A"],
        },
      ],
    })
    expect(rows[0]).toMatchObject({ year: 2024, division: "2A", champion_school: "Trinity" })
  })

  it("parses placer JSON classifications", () => {
    const rows = parsePlacerJsonPayload({
      year: 2026,
      classifications: [
        {
          classification: "7A",
          weight_classes: [
            {
              weight: 165,
              places: [{ place: 1, name: "Example", school: "Example HS" }],
            },
          ],
        },
      ],
    })
    expect(rows).toHaveLength(1)
    expect(rows[0].weight_class).toBe("165")
  })

  it("parses Guaranteed Places text blocks", () => {
    const text = `
## 1A 106

Guaranteed Places

- 1st Place – Skyler Anderson of Robbinsville High School
- 2nd Place – Someone Else of Avery County High School

1st Place Match
`
    const rows = parseNchsaaGuaranteedPlacesText(text, { year: 2025 })
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      year: 2025,
      classification: "1A",
      weight_class: "106",
      place: 1,
      wrestler_name: "Skyler Anderson",
      school: "Robbinsville",
    })
  })
})

describe("public-imports diff", () => {
  it("marks new / match / changed duals", () => {
    const diffs = diffDualTeamRows(
      [
        { year: 2025, division: "4A", champion_school: "Cardinal Gibbons" },
        { year: 2024, division: "4A", champion_school: "Davie County" },
        { year: 2023, division: "4A", champion_school: "New Champ" },
      ],
      [
        { year: 2025, division: "4A", champion_school: "Cardinal Gibbons" },
        { year: 2024, division: "4A", champion_school: "Different School" },
      ],
    )
    const byYear = Object.fromEntries(diffs.map((d) => [d.proposed.year, d.diff_status]))
    expect(byYear[2025]).toBe("match")
    expect(byYear[2024]).toBe("changed")
    expect(byYear[2023]).toBe("new")
    expect(summarizeDiffs(diffs)).toMatchObject({ match: 1, changed: 1, new: 1 })
  })

  it("diffs placers by year|class|weight|place", () => {
    const diffs = diffPlacerRows(
      [{ year: 2025, classification: "1A", weight_class: "106", place: 1, wrestler_name: "A", school: "S" }],
      [
        {
          year: 2025,
          classification: "1A",
          weight_class: "106",
          place: 1,
          wrestler_name: "A",
          school: "S High School",
        },
      ],
    )
    expect(diffs[0].diff_status).toBe("match")
  })
})
