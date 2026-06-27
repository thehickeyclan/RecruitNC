import { describe, expect, it } from "vitest"
import {
  computeNationalTeamAggregatePercentages,
  mergeAauScholastic2026IntoAggregate,
  type NationalTeamAggregateTotals,
} from "@/lib/national-team-tournament-aggregate"

function emptyTotals(): NationalTeamAggregateTotals {
  return {
    tournamentCount: 4,
    totalTeamWins: 30,
    totalTeamLosses: 6,
    totalIndividualWins: 400,
    totalIndividualLosses: 120,
    uniqueAthletes: new Set(["mac johnson"]),
  }
}

describe("national team tournament aggregate", () => {
  it("merges AAU Scholastic Duals 2026 when not already in DB", () => {
    const totals = emptyTotals()
    const card = mergeAauScholastic2026IntoAggregate(false, totals)

    expect(card).toEqual({
      dualRecord: "11-1",
      individual: "127-36",
      winPct: 78,
      placement: "2nd Place · Gold Pool",
      ready: true,
    })
    expect(totals.tournamentCount).toBe(5)
    expect(totals.totalTeamWins).toBe(41)
    expect(totals.totalTeamLosses).toBe(7)
    expect(totals.totalIndividualWins).toBe(527)
    expect(totals.totalIndividualLosses).toBe(156)
    expect(totals.uniqueAthletes.size).toBe(14)
  })

  it("skips AAU merge when tournament already exists in DB", () => {
    const totals = emptyTotals()
    expect(mergeAauScholastic2026IntoAggregate(true, totals)).toBeNull()
    expect(totals.tournamentCount).toBe(4)
  })

  it("recomputes aggregate win percentages from merged totals", () => {
    const totals = emptyTotals()
    mergeAauScholastic2026IntoAggregate(false, totals)
    const pct = computeNationalTeamAggregatePercentages(totals)

    expect(pct.teamRecordWinPercentage).toBe(85)
    expect(pct.overallWinPercentage).toBe(77)
  })
})
