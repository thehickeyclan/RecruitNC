import { describe, expect, it } from "vitest"
import { mergeNhsca2026CanonicalAaIntoLeaderboardRows } from "./nhsca-2026-archive"

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
