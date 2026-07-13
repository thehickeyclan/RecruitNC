import { describe, expect, it } from "vitest"
import {
  dedupeNhscaAllAmericanRows,
  extractNchsaaClassification,
  formatNhscaAllAmericansAnswer,
  formatNchsaaStateTournamentAnswer,
  matchesNchsaaClassificationFilter,
  parseTournamentResultsQuery,
  pickBetterNhscaAthleteName,
} from "@/lib/data-dawg-tournament-results-query"

describe("parseTournamentResultsQuery", () => {
  it("parses show me the results of the 2017 state tournament", () => {
    expect(parseTournamentResultsQuery("Show me the results of the 2017 State tournament?")).toEqual({
      kind: "nchsaa_state",
      year: 2017,
      gender: "men",
      classification: null,
    })
  })

  it("parses show all 4A state placers from a year", () => {
    expect(parseTournamentResultsQuery("Show me all 4A state placers from 2025")).toEqual({
      kind: "nchsaa_state",
      year: 2025,
      gender: "men",
      classification: "4A",
    })
  })

  it("parses 4a placers in 2024", () => {
    expect(parseTournamentResultsQuery("Show all 4a placers in 2024")).toEqual({
      kind: "nchsaa_state",
      year: 2024,
      gender: "men",
      classification: "4A",
    })
  })

  it("parses 1A/2A state results", () => {
    expect(parseTournamentResultsQuery("Show 1A/2A state placers from 2026")).toEqual({
      kind: "nchsaa_state",
      year: 2026,
      gender: "men",
      classification: "1A/2A",
    })
  })

  it("parses NHSCA all americans in a year", () => {
    expect(
      parseTournamentResultsQuery("Show me the results of NHSCA all americans in 2022"),
    ).toEqual({
      kind: "nhsca_all_americans",
      year: 2022,
      gender: "men",
      classification: null,
    })
  })

  it("parses who was an nhsca all american in a year", () => {
    expect(parseTournamentResultsQuery("Who was an nhsca all american in 2017")).toEqual({
      kind: "nhsca_all_americans",
      year: 2017,
      gender: "men",
      classification: null,
    })
  })

  it("parses who were the nhsca all americans plural", () => {
    expect(parseTournamentResultsQuery("Who were the NHSCA All-Americans in 2019?")).toEqual({
      kind: "nhsca_all_americans",
      year: 2019,
      gender: "men",
      classification: null,
    })
  })

  it("parses 2017 NCHSAA state results phrasing", () => {
    expect(parseTournamentResultsQuery("What were the 2017 NCHSAA state results?")).toEqual({
      kind: "nchsaa_state",
      year: 2017,
      gender: "men",
      classification: null,
    })
  })

  it("parses nhsca nationals with year", () => {
    expect(parseTournamentResultsQuery("NHSCA nationals results from 2020")).toEqual({
      kind: "nhsca_all_americans",
      year: 2020,
      gender: "men",
      classification: null,
    })
  })

  it("detects women's NHSCA when asked", () => {
    expect(parseTournamentResultsQuery("Show NHSCA All-Americans for girls in 2023")).toEqual({
      kind: "nhsca_all_americans",
      year: 2023,
      gender: "women",
      classification: null,
    })
  })

  it("returns null without a year", () => {
    expect(parseTournamentResultsQuery("Show me NHSCA All-Americans")).toBeNull()
  })

  it("returns null for unrelated questions", () => {
    expect(parseTournamentResultsQuery("Who is Liam Hickey?")).toBeNull()
  })

  it("parses Fargo nationals results by year", () => {
    expect(parseTournamentResultsQuery("Show Fargo results 2026")).toEqual({
      kind: "fargo_nationals",
      year: 2026,
      gender: "men",
      classification: null,
    })
  })

  it("parses who wrestled at fargo in a year", () => {
    expect(parseTournamentResultsQuery("Who wrestled at Fargo in 2024?")).toEqual({
      kind: "fargo_nationals",
      year: 2024,
      gender: "men",
      classification: null,
    })
  })
})

describe("formatNhscaAllAmericansAnswer", () => {
  it("groups by division and formats placers", () => {
    const answer = formatNhscaAllAmericansAnswer(
      { kind: "nhsca_all_americans", year: 2017, gender: "men", classification: null },
      [
        {
          athlete_name: "Test Wrestler",
          placement: 3,
          year: 2017,
          division: "Senior",
          weight_class: "132",
          high_school: "Test High",
        },
      ],
    )
    expect(answer).toContain("2017")
    expect(answer).toContain("Test Wrestler")
    expect(answer).toContain("132 lbs")
  })

  it("does not double-append lbs when weight already includes lbs", () => {
    const answer = formatNhscaAllAmericansAnswer(
      { kind: "nhsca_all_americans", year: 2023, gender: "men", classification: null },
      [
        {
          athlete_name: "Lorenzo Alston",
          placement: 2,
          year: 2023,
          division: "Freshman",
          weight_class: "145lbs",
          high_school: "Uwharrie Charter",
        },
      ],
    )
    expect(answer).toContain("145 lbs")
    expect(answer).not.toContain("145lbs lbs")
  })
})

describe("dedupeNhscaAllAmericanRows", () => {
  it("merges placements + legacy rows with different weight/school formatting", () => {
    const merged = dedupeNhscaAllAmericanRows([
      {
        athlete_name: "Lorenzo Alston",
        placement: 2,
        year: 2023,
        division: "Freshman",
        weight_class: "145",
        high_school: "Uwharrie Charter",
        source: "placements",
      },
      {
        athlete_name: "Lorenzo Alston",
        placement: 2,
        year: 2023,
        division: "Freshman",
        weight_class: "145lbs",
        high_school: "Uwharrie Charter",
        source: "legacy",
      },
      {
        athlete_name: "Dominic Hittepole",
        placement: 5,
        year: 2023,
        division: "Freshman",
        weight_class: "170",
        high_school: "Trinity",
        source: "placements",
      },
      {
        athlete_name: "Dominic Hittepole",
        placement: 5,
        year: 2023,
        division: "Freshman",
        weight_class: "170lbs",
        high_school: "Wheatmore",
        source: "legacy",
      },
    ])

    expect(merged).toHaveLength(2)
    expect(merged.find((r) => r.athlete_name === "Lorenzo Alston")?.weight_class).toBe("145")
    expect(merged.find((r) => r.athlete_name === "Dominic Hittepole")?.high_school).toBe("Wheatmore")
  })

  it("merges same bracket slot when athlete names differ (school bleed / import variants)", () => {
    const merged = dedupeNhscaAllAmericanRows([
      {
        athlete_name: "Jacob Perry New",
        placement: 8,
        year: 2025,
        division: "Freshman",
        weight_class: "152",
        high_school: "Bern",
        source: "legacy",
      },
      {
        athlete_name: "Jacob Perry",
        placement: 8,
        year: 2025,
        division: "Freshman",
        weight_class: "152",
        high_school: "New Bern",
        source: "placements",
      },
      {
        athlete_name: "Everest Ouellette Kitty",
        placement: 3,
        year: 2025,
        division: "Senior",
        weight_class: "285",
        high_school: "Hawk",
        source: "legacy",
      },
      {
        athlete_name: "Everest Ouellette",
        placement: 3,
        year: 2025,
        division: "Senior",
        weight_class: "285",
        high_school: "First Flight",
        source: "placements",
      },
    ])

    expect(merged).toHaveLength(2)
    expect(merged.find((r) => r.weight_class === "152")?.athlete_name).toBe("Jacob Perry")
    expect(merged.find((r) => r.weight_class === "152")?.high_school).toBe("New Bern")
    expect(merged.find((r) => r.weight_class === "285")?.athlete_name).toBe("Everest Ouellette")
    expect(merged.find((r) => r.weight_class === "285")?.high_school).toBe("First Flight")
  })

  it("keeps separate placers at the same weight when placement differs", () => {
    const merged = dedupeNhscaAllAmericanRows([
      {
        athlete_name: "Wrestler A",
        placement: 7,
        year: 2025,
        division: "Freshman",
        weight_class: "132",
        high_school: "School A",
      },
      {
        athlete_name: "Wrestler B",
        placement: 8,
        year: 2025,
        division: "Freshman",
        weight_class: "132",
        high_school: "School B",
      },
    ])
    expect(merged).toHaveLength(2)
  })
})

describe("pickBetterNhscaAthleteName", () => {
  it("strips school words accidentally appended to a name", () => {
    expect(
      pickBetterNhscaAthleteName("Jacob Perry New", "Jacob Perry", "Bern", "New Bern"),
    ).toBe("Jacob Perry")
    expect(
      pickBetterNhscaAthleteName("Aaron Ruiz-angel Pilot", "Aaron Ruiz-Angel", "Mountain", "Mount Airy"),
    ).toBe("Aaron Ruiz-Angel")
  })
})

describe("extractNchsaaClassification", () => {
  it("extracts standard divisions", () => {
    expect(extractNchsaaClassification("Show me all 4A state placers from 2025")).toBe("4A")
    expect(extractNchsaaClassification("7a state results 2026")).toBe("7A")
    expect(extractNchsaaClassification("Show 1A/2A state placers from 2026")).toBe("1A/2A")
    expect(extractNchsaaClassification("1-4A state placers 2026")).toBe("1-4A")
  })
})

describe("matchesNchsaaClassificationFilter", () => {
  it("maps 1A queries to 1A/2A in 2026", () => {
    expect(matchesNchsaaClassificationFilter("1A/2A", "1A", 2026)).toBe(true)
    expect(matchesNchsaaClassificationFilter("3A", "1A", 2026)).toBe(false)
  })

  it("matches exact division", () => {
    expect(matchesNchsaaClassificationFilter("4A", "4A", 2025)).toBe(true)
    expect(matchesNchsaaClassificationFilter("5A", "4A", 2025)).toBe(false)
  })
})

describe("formatNchsaaStateTournamentAnswer", () => {
  it("includes classification in header when filtered", () => {
    const answer = formatNchsaaStateTournamentAnswer(
      { kind: "nchsaa_state", year: 2025, gender: "men", classification: "4A" },
      [
        {
          wrestler_name: "State Champ",
          place: 1,
          year: 2025,
          classification: "4A",
          weight_class: "145",
          school: "Example HS",
        },
      ],
    )
    expect(answer).toContain("4A")
    expect(answer).toContain("State Champ")
  })

  it("links to the year page and lists placers", () => {
    const answer = formatNchsaaStateTournamentAnswer(
      { kind: "nchsaa_state", year: 2017, gender: "men", classification: null },
      [
        {
          wrestler_name: "State Champ",
          place: 1,
          year: 2017,
          classification: "3A",
          weight_class: "145",
          school: "Example HS",
        },
      ],
    )
    expect(answer).toContain("/nchsaa/2017")
    expect(answer).toContain("State Champ")
  })
})
