import { describe, expect, it } from "vitest"
import { mergeNhscaByYearPreferRoster, type TournamentResultRow } from "@/lib/tournament-tables"

describe("mergeNhscaByYearPreferRoster", () => {
  const r = (year: number, placement: string, record: string, division = ""): TournamentResultRow => ({
    year,
    placement,
    record,
    division,
  })

  it("keeps placement years when roster has a different year (2025 AA + 2026 roster)", () => {
    const roster = [r(2026, "4th", "5-1", "Sophomore")]
    const placement = [r(2025, "4th", "5-2", "Freshman")]
    const merged = mergeNhscaByYearPreferRoster(roster, placement, [])
    expect(merged.map((x) => x.year).sort((a, b) => a - b)).toEqual([2025, 2026])
    expect(merged.find((x) => x.year === 2025)?.record).toBe("5-2")
    expect(merged.find((x) => x.year === 2026)?.division).toBe("Sophomore")
  })

  it("for same year, roster replaces placement", () => {
    const roster = [r(2026, "3rd", "6-1", "Sophomore")]
    const placement = [r(2026, "8th", "2-2", "Sophomore")]
    const merged = mergeNhscaByYearPreferRoster(roster, placement, [])
    expect(merged).toHaveLength(1)
    expect(merged[0].placement).toBe("3rd")
  })

  it("legacy fills years missing from roster and placement", () => {
    const legacy = [r(2024, "2nd", "4-1", "Junior")]
    const merged = mergeNhscaByYearPreferRoster([], [], legacy)
    expect(merged).toHaveLength(1)
    expect(merged[0].year).toBe(2024)
  })

  it("legacy skipped when placement already has that year", () => {
    const placement = [r(2025, "4th", "5-2", "Freshman")]
    const legacy = [r(2025, "1st", "6-0", "Freshman")]
    const merged = mergeNhscaByYearPreferRoster([], placement, legacy)
    expect(merged).toHaveLength(1)
    expect(merged[0].placement).toBe("4th")
  })
})
