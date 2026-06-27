import { describe, expect, it } from "vitest"
import { AAU_SCHOLASTIC_DUALS_2026_DUALS } from "@/lib/aau-scholastic-duals-2026-results"
import {
  AAU_SCHOLASTIC_DUALS_2026_DUAL_BOUTS,
  getAauScholasticDualBouts,
  sumAauDualBoutTeamPoints,
} from "@/lib/aau-scholastic-duals-2026-dual-bouts"

describe("AAU Scholastic Duals 2026 dual bout logs", () => {
  it.each([1, 2, 3, 4, 5, 6, 8, 9, 10, 12])("match %i bout log matches dual score", (matchNumber) => {
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
})
