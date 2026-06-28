import { describe, expect, it } from "vitest"
import {
  AAU_SCHOLASTIC_DUALS_2026_INDIVIDUALS,
  AAU_SCHOLASTIC_DUALS_2026_RESULTS_META,
  AAU_SCHOLASTIC_DUALS_2026_TEAM_SUMMARY,
  AAU_SCHOLASTIC_DUALS_2026_WIN_TYPES,
  aauIndividualWinPct,
  sortAauIndividualsByWeight,
  sumAauIndividualStats,
} from "@/lib/aau-scholastic-duals-2026-results"

/** Corrected Fort Lauderdale individual stats (assigned wrestlers only). */
const EXPECTED_INDIVIDUALS: Array<{
  wrestler: string
  record: string
  grossPts: number
  allowedPts: number
  netPts: number
}> = [
  { wrestler: "Mac Johnson", record: "12-0", grossPts: 65, allowedPts: 0, netPts: 65 },
  { wrestler: "Aaron Ellison", record: "12-0", grossPts: 54, allowedPts: 0, netPts: 54 },
  { wrestler: "Tye Johnson", record: "11-1", grossPts: 55, allowedPts: 6, netPts: 49 },
  { wrestler: "Tobin McNair", record: "10-2", grossPts: 53, allowedPts: 9, netPts: 44 },
  { wrestler: "Luke Richards", record: "10-2", grossPts: 48, allowedPts: 8, netPts: 40 },
  { wrestler: "Gavin Lopez", record: "10-2", grossPts: 51, allowedPts: 11, netPts: 40 },
  { wrestler: "Jake Amiott", record: "10-2", grossPts: 46, allowedPts: 7, netPts: 39 },
  { wrestler: "Jacob Perry", record: "9-3", grossPts: 44, allowedPts: 12, netPts: 32 },
  { wrestler: "Luke Padgett", record: "9-3", grossPts: 43, allowedPts: 13, netPts: 30 },
  { wrestler: "Fares Alkurdasi", record: "9-3", grossPts: 39, allowedPts: 11, netPts: 28 },
  { wrestler: "Aiden Burkholder", record: "8-4", grossPts: 38, allowedPts: 14, netPts: 24 },
  { wrestler: "Xan Moody", record: "7-5", grossPts: 38, allowedPts: 17, netPts: 21 },
  { wrestler: "Paxton Kearns", record: "8-4", grossPts: 36, allowedPts: 18, netPts: 18 },
  { wrestler: "Mason Hocker", record: "2-5", grossPts: 9, allowedPts: 22, netPts: -13 },
]

describe("AAU Scholastic Duals 2026 individual results", () => {
  it("matches corrected wrestler table", () => {
    expect(AAU_SCHOLASTIC_DUALS_2026_INDIVIDUALS).toHaveLength(EXPECTED_INDIVIDUALS.length)

    for (const expected of EXPECTED_INDIVIDUALS) {
      const row = AAU_SCHOLASTIC_DUALS_2026_INDIVIDUALS.find((r) => r.wrestler === expected.wrestler)
      expect(row, `missing ${expected.wrestler}`).toBeDefined()
      expect(`${row!.wins}-${row!.losses}`).toBe(expected.record)
      expect(row!.grossPts).toBe(expected.grossPts)
      expect(row!.allowedPts).toBe(expected.allowedPts)
      expect(row!.netPts).toBe(expected.netPts)
      expect(row!.grossPts - row!.allowedPts).toBe(row!.netPts)
    }
  })

  it("team totals match assigned-wrestler aggregates", () => {
    const totals = sumAauIndividualStats(AAU_SCHOLASTIC_DUALS_2026_INDIVIDUALS)
    const summary = AAU_SCHOLASTIC_DUALS_2026_TEAM_SUMMARY
    const meta = AAU_SCHOLASTIC_DUALS_2026_RESULTS_META

    expect(totals.wins).toBe(127)
    expect(totals.losses).toBe(36)
    expect(totals.grossPts).toBe(619)
    expect(totals.allowedPts).toBe(148)
    expect(totals.netPts).toBe(471)

    expect(summary.individualRecord).toBe("127-36")
    expect(summary.individualGrossPoints).toBe(619)
    expect(summary.individualPointsAllowed).toBe(148)
    expect(summary.individualNetPoints).toBe(471)
    expect(meta.individualRecord).toBe("127-36")
    expect(aauIndividualWinPct(AAU_SCHOLASTIC_DUALS_2026_INDIVIDUALS)).toBe(77.9)
    expect(summary.individualWinPct).toBe(77.9)
  })

  it("win types sum to individual bout wins", () => {
    const wt = AAU_SCHOLASTIC_DUALS_2026_WIN_TYPES
    expect(wt.falls + wt.techFalls + wt.majorDecisions + wt.decisions + wt.forfeits + wt.injuryDefault).toBe(127)
    expect(wt.totalWins).toBe(127)
  })

  it("sorts individuals by weight class for public lineup display", () => {
    const sorted = sortAauIndividualsByWeight(AAU_SCHOLASTIC_DUALS_2026_INDIVIDUALS)
    expect(sorted.map((r) => r.weightLabel)).toEqual([
      "106+5",
      "113+5",
      "120+5",
      "126+5",
      "132+5",
      "138+5",
      "144+5",
      "150+5",
      "157+5",
      "165+5",
      "175+5",
      "190+5",
      "215+5",
      "HWT",
    ])
    expect(sorted[0]!.wrestler).toBe("Xan Moody")
    expect(sorted[4]!.wrestler).toBe("Mac Johnson")
  })
})
