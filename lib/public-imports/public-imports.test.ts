import { describe, expect, it } from "vitest"
import { diffDualTeamRows, diffPlacerRows, summarizeDiffs } from "./diff"
import { namesLooselyEqual, schoolsLooselyEqual } from "./normalize"
import {
  parseDualTeamPayload,
  parseNchsaaChampionshipFinalsText,
  parseNchsaaDualTeamChampionshipsText,
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

  it("parses 2026-style dual State Champion blocks with class queue", () => {
    const text = `
1A
2A
3A
4A
5A
6A
7A
8A
State Champion: Robbinsville High School
State Championship Match:
Robbinsville 58, South Davidson 24
State Champion: Rosewood High School
State Championship Match:
Rosewood 56, East Wilkes 15
3A Classification – State Champion: Trinity High School
State Championship Match:
Trinity 42, West Lincoln 33
State Champion: Uwharrie Charter Academy
State Championship Match:
Uwharrie Charter 44, Pisgah 28
State Champion: West Rowan High School
State Championship Match:
West Rowan 38, Croatan 30
State Champion: Union Pines High School
State Championship Match:
Union Pines 37, St. Stephens 21
State Champion: Davie County High School
State Championship Match:
Davie 40, New Bern 30
State Champion: William Amos Hough High School
State Championship Match:
Hough 45, Millbrook 20
`
    const rows = parseNchsaaDualTeamChampionshipsText(text, { year: 2026 })
    expect(rows).toHaveLength(8)
    expect(rows.find((r) => r.division === "1A")).toMatchObject({
      champion_school: "Robbinsville",
      runner_up_school: "South Davidson",
      champion_score: 58,
      runner_up_score: 24,
    })
    expect(rows.find((r) => r.division === "5A")).toMatchObject({
      champion_school: "West Rowan",
      runner_up_school: "Croatan",
      champion_score: 38,
    })
    expect(rows.find((r) => r.division === "8A")?.champion_school).toBe("William Amos Hough")
  })

  it("parses 2025-style dual article headlines + scores", () => {
    const text = `
Uwharrie Charter three-peats as 1A Champion
The Uwharrie Charter Eagles defeated Mount Airy 48-15 on Saturday.
R-S Central wins thriller in 2A Championship
The Rutherfordton – Spindale Central Hilltoppers edged past the Seaforth Hawks 34-32 on Saturday.
Union Pines breaks through for first title
Union Pines earned its first championship with a 47-17 win against the Pisgah Bears.
The winners of the 3A Wrestling NC Farm Bureau Sportsmanship Awards were Dantrell Williams from Union Pines and Kane Bryson from Pisgah.
Cardinal Gibbons wins first Dual Team Wrestling Title
The Cardinal Gibbons Crusaders earned the program’s first NCHSAA Dual Team Wrestling Championship with a 41-22 win against Hickory Ridge on Saturday.
The winners of the 4A Wrestling NC Farm Bureau Sportsmanship Awards were Spencer Sterling from Cardinal Gibbons and Colt Campbell from Hickory Ridge.
`
    const rows = parseNchsaaDualTeamChampionshipsText(text, { year: 2025 })
    expect(rows.find((r) => r.division === "1A")).toMatchObject({
      champion_school: "Uwharrie Charter",
      runner_up_school: "Mount Airy",
      champion_score: 48,
      runner_up_score: 15,
    })
    expect(rows.find((r) => r.division === "2A")).toMatchObject({
      champion_school: "R-S Central",
      runner_up_school: "Seaforth",
      champion_score: 34,
      runner_up_score: 32,
    })
    expect(rows.find((r) => r.division === "3A")).toMatchObject({
      champion_school: "Union Pines",
      runner_up_school: "Pisgah",
      champion_score: 47,
    })
    expect(rows.find((r) => r.division === "4A")).toMatchObject({
      champion_school: "Cardinal Gibbons",
      runner_up_school: "Hickory Ridge",
      champion_score: 41,
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
