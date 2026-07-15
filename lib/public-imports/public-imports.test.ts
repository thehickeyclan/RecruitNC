import { describe, expect, it } from "vitest"
import { diffDualTeamRows, diffPlacerRows, summarizeDiffs } from "./diff"
import { namesLooselyEqual, schoolsLooselyEqual } from "./normalize"
import {
  parseDualTeamPayload,
  parseNchsaaChampionshipFinalsText,
  parseNchsaaGuaranteedPlacesText,
  parseNchsaaIndividualStatesText,
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

  it("parses Championship Finals (place 1–2) from 2026-style pages", () => {
    const text = `
Championship Finals

7A 138

Tye Johnson (Cape Fear) 38-0 won by major decision over Aidan Szewczyk (Davie) 47-6 (MD 18-5)

4A 175

Lorenzo Alston (Uwharrie Charter Academy) 47-0 won by decision over Jacob Reigel (Mount Pleasant High School) 49-1 (Dec 8-1)
`
    const rows = parseNchsaaChampionshipFinalsText(text, { year: 2026 })
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          classification: "7A",
          weight_class: "138",
          place: 1,
          wrestler_name: "Tye Johnson",
          school: "Cape Fear",
        }),
        expect.objectContaining({
          classification: "7A",
          weight_class: "138",
          place: 2,
          wrestler_name: "Aidan Szewczyk",
          school: "Davie",
        }),
        expect.objectContaining({
          classification: "4A",
          place: 1,
          wrestler_name: "Lorenzo Alston",
          school: "Uwharrie Charter",
        }),
      ]),
    )
    const merged = parseNchsaaIndividualStatesText(text, { year: 2026 })
    expect(merged.filter((r) => r.place === 1)).toHaveLength(2)
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

  it("treats apostrophe variants as the same placers match", () => {
    const diffs = diffPlacerRows(
      [
        {
          year: 2026,
          classification: "6A",
          weight_class: "120",
          place: 1,
          wrestler_name: "Jackson D`Ettore",
          school: "Charlotte Catholic",
          gender: "M",
        },
      ],
      [
        {
          year: 2026,
          classification: "6A",
          weight_class: "120",
          place: 1,
          wrestler_name: "Jackson D'Ettore",
          school: "Charlotte Catholic",
        },
      ],
    )
    expect(diffs[0].diff_status).toBe("match")
    expect(diffs[0].proposed.wrestler_name).toBe("Jackson D'Ettore")
  })

  it("does not overwrite a different athlete in the same class/weight/place slot", () => {
    const diffs = diffPlacerRows(
      [
        {
          year: 2026,
          classification: "5A",
          weight_class: "138",
          place: 1,
          wrestler_name: "Cameron Massey",
          school: "North Gaston",
          gender: "M",
        },
      ],
      [
        {
          year: 2026,
          classification: "5A",
          weight_class: "138",
          place: 1,
          wrestler_name: "madelyn korvink",
          school: "Parkwood",
        },
      ],
    )
    expect(diffs[0].diff_status).toBe("new")
    expect(diffs[0].existing).toBeNull()
  })
})
