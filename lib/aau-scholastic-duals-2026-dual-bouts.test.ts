import { describe, expect, it } from "vitest"
import {
  AAU_SCHOLASTIC_DUALS_2026_DUALS,
  AAU_SCHOLASTIC_DUALS_2026_INDIVIDUALS,
} from "@/lib/aau-scholastic-duals-2026-results"
import {
  AAU_SCHOLASTIC_DUALS_2026_DUAL_BOUTS,
  buildAauIndividualBoutLogsByWrestler,
  getAauScholasticDualBouts,
  resolveAauBoutWrestlerName,
  sumAauDualBoutTeamPoints,
} from "@/lib/aau-scholastic-duals-2026-dual-bouts"

describe("AAU Scholastic Duals 2026 dual bout logs", () => {
  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12])("match %i bout log matches dual score", (matchNumber) => {
    const dual = AAU_SCHOLASTIC_DUALS_2026_DUALS.find((d) => d.matchNumber === matchNumber)
    expect(dual).toBeDefined()

    const bouts = getAauScholasticDualBouts(matchNumber)
    expect(bouts).toHaveLength(14)

    const totals = sumAauDualBoutTeamPoints(bouts)
    expect(totals.ourScore).toBe(dual!.ourScore)
    expect(totals.opponentScore).toBe(dual!.opponentScore)
  })

  it("match 11 bout log matches NC team score (Spec Ops)", () => {
    const dual = AAU_SCHOLASTIC_DUALS_2026_DUALS.find((d) => d.matchNumber === 11)
    expect(dual).toBeDefined()

    const bouts = getAauScholasticDualBouts(11)
    expect(bouts).toHaveLength(14)

    const totals = sumAauDualBoutTeamPoints(bouts)
    expect(totals.ourScore).toBe(dual!.ourScore)
  })

  it("bout logs are keyed only to known dual match numbers", () => {
    for (const matchNumber of Object.keys(AAU_SCHOLASTIC_DUALS_2026_DUAL_BOUTS).map(Number)) {
      expect(AAU_SCHOLASTIC_DUALS_2026_DUALS.some((d) => d.matchNumber === matchNumber)).toBe(true)
    }
  })

  it("maps bout abbreviations to roster names", () => {
    expect(resolveAauBoutWrestlerName("A. Moody", AAU_SCHOLASTIC_DUALS_2026_INDIVIDUALS)).toBe("Xan Moody")
    expect(resolveAauBoutWrestlerName("M. Johnson", AAU_SCHOLASTIC_DUALS_2026_INDIVIDUALS)).toBe("Mac Johnson")
    expect(resolveAauBoutWrestlerName("T. Johnson", AAU_SCHOLASTIC_DUALS_2026_INDIVIDUALS)).toBe("Tye Johnson")
  })

  it("individual bout logs align with published records when dual bout data exists", () => {
    const logs = buildAauIndividualBoutLogsByWrestler(
      AAU_SCHOLASTIC_DUALS_2026_DUALS,
      AAU_SCHOLASTIC_DUALS_2026_INDIVIDUALS,
    )

    for (const row of AAU_SCHOLASTIC_DUALS_2026_INDIVIDUALS) {
      const wrestlerLogs = logs[row.wrestler] ?? []
      if (wrestlerLogs.length === 0) continue

      const wins = wrestlerLogs.filter((b) => b.won).length
      const losses = wrestlerLogs.filter((b) => !b.won).length

      expect(wins + losses).toBe(wrestlerLogs.length)
      expect(wins).toBeLessThanOrEqual(row.wins)
      expect(losses).toBeLessThanOrEqual(row.losses)

      // Full weekend coverage (all duals exported) — exact match
      if (wins + losses === row.wins + row.losses) {
        expect(wins).toBe(row.wins)
        expect(losses).toBe(row.losses)
      }
    }

    expect(Object.keys(logs).length).toBe(AAU_SCHOLASTIC_DUALS_2026_INDIVIDUALS.length)
  })
})
