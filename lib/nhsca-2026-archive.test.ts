import { describe, expect, it } from "vitest"
import {
  mergeCanonicalNhscaArchiveWrestlersIntoRows,
  mergeNhsca2026CanonicalAaIntoLeaderboardRows,
} from "./nhsca-2026-archive"
import { listCanonicalNhscaAaYears } from "./nhsca-canonical-aa"

describe("mergeNhsca2026CanonicalAaIntoLeaderboardRows (compat)", () => {
  it("delegates to year-agnostic registry merge", () => {
    const merged = mergeNhsca2026CanonicalAaIntoLeaderboardRows([
      {
        athlete_name: "Bentley Sly",
        year: 2026,
        placement: 2,
        division: "Senior",
        high_school: null,
      },
    ])
    expect(merged.find((r) => r.athlete_name === "Bentley Sly")?.high_school).toBe("Stuart Cramer")
  })
})

describe("mergeCanonicalNhscaArchiveWrestlersIntoRows", () => {
  it("includes registered years (2026+) even when DB has none for that year", () => {
    expect(listCanonicalNhscaAaYears()).toContain(2026)
    const merged = mergeCanonicalNhscaArchiveWrestlersIntoRows([
      {
        id: "old",
        athlete_name: "Legacy Athlete",
        year: 2020,
        weight: "138lbs",
        placement: 1,
        division: "Senior",
        state: "NC",
        high_school: "Test HS",
        club: "",
      },
    ])
    expect(merged.some((r) => r.year === 2020)).toBe(true)
    expect(merged.some((r) => r.year === 2026)).toBe(true)
    expect(merged.filter((r) => r.year === 2026).length).toBeGreaterThanOrEqual(18)
  })

  it("keeps future DB-only years that are not yet in the canonical registry", () => {
    const merged = mergeCanonicalNhscaArchiveWrestlersIntoRows([
      {
        id: "future",
        athlete_name: "Future Champ",
        year: 2099,
        weight: "144lbs",
        placement: 3,
        division: "Junior",
        state: "NC",
        high_school: "Future HS",
        club: "",
      },
    ])
    expect(merged.find((r) => r.year === 2099)?.athlete_name).toBe("Future Champ")
    expect(merged.some((r) => r.year === 2026)).toBe(true)
  })
})
