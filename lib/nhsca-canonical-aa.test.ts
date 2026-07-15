import { describe, expect, it } from "vitest"
import {
  getAllCanonicalNhscaAllAmericans,
  getAllCanonicalNhscaArchiveAthletes,
  latestCanonicalNhscaAaYear,
  listCanonicalNhscaAaYears,
  mergeCanonicalNhscaAaIntoLeaderboardRows,
} from "./nhsca-canonical-aa"

describe("nhsca-canonical-aa registry", () => {
  it("includes registered years (at least 2026)", () => {
    expect(listCanonicalNhscaAaYears()).toContain(2026)
    expect(getAllCanonicalNhscaAllAmericans().length).toBeGreaterThanOrEqual(18)
    expect(getAllCanonicalNhscaArchiveAthletes().length).toBeGreaterThanOrEqual(18)
    expect(latestCanonicalNhscaAaYear()).toBeGreaterThanOrEqual(2026)
  })

  it("merges schools for registered years and drops null-school shells", () => {
    const merged = mergeCanonicalNhscaAaIntoLeaderboardRows([
      {
        athlete_name: "Bentley Sly",
        year: 2026,
        placement: 2,
        division: "Senior",
        high_school: null,
      },
      {
        athlete_name: "Someone Else",
        year: 2025,
        placement: 1,
        division: "Senior",
        high_school: "Cardinal Gibbons",
      },
    ])
    expect(merged.find((r) => r.athlete_name === "Bentley Sly")?.high_school).toBe("Stuart Cramer")
    expect(merged.some((r) => r.year === 2025)).toBe(true)
    expect(merged.some((r) => r.year === 2026 && r.athlete_name === "Braylen Yates")).toBe(true)
  })
})
