import { describe, expect, it } from "vitest"
import { mergeNhscaForPublicRankings } from "@/lib/public-profile-data"
import type { TournamentResultRow } from "@/lib/tournament-tables"

describe("mergeNhscaForPublicRankings", () => {
  it("replaces bogus placement-only table row when profile has a real record and no placement", () => {
    const fromTables: TournamentResultRow[] = [
      {
        year: 2026,
        placement: "3rd All-American",
        record: "",
        weight: "145",
        division: "Sophomore",
      },
    ]
    const fromProfile = [
      {
        year: 2026,
        placement: "",
        record: "5-2",
        weight: "145",
        division: "Sophomore",
      },
    ]
    const out = mergeNhscaForPublicRankings(fromTables, fromProfile, 2028)
    const row = out.find((r) => r.year === 2026)
    expect(row?.record).toBe("5-2")
    expect((row?.placement ?? "").trim()).toBe("")
  })

  it("keeps table row when it already has record + placement", () => {
    const fromTables: TournamentResultRow[] = [
      {
        year: 2026,
        placement: "4th All-American",
        record: "7-2",
        weight: "160",
        division: "Junior",
      },
    ]
    const fromProfile = [
      {
        year: 2026,
        placement: "",
        record: "0-0",
        weight: "160",
        division: "Junior",
      },
    ]
    const out = mergeNhscaForPublicRankings(fromTables, fromProfile, 2027)
    const row = out.find((r) => r.year === 2026)
    expect(row?.record).toBe("7-2")
    expect(row?.placement).toMatch(/4th/)
  })
})
