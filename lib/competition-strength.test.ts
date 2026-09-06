import { describe, expect, it } from "vitest"
import {
  opponentPercentile,
  seasonStrengthLine,
  summarizeNationalExposure,
  summarizeSeasonStrength,
} from "@/lib/competition-strength"

const bout = (over: Record<string, unknown> = {}) => ({
  win_loss: "W",
  result: "Dec",
  opponent_percentage: "80.00%",
  ...over,
})

describe("opponentPercentile", () => {
  it("reads the percentage as stored", () => {
    expect(opponentPercentile({ opponent_percentage: "96.14%" })).toBe(96.14)
  })

  it("is null when absent, so it cannot be mistaken for a weak opponent", () => {
    expect(opponentPercentile({})).toBeNull()
    expect(opponentPercentile({ opponent_percentage: "" })).toBeNull()
  })
})

describe("summarizeSeasonStrength", () => {
  it("separates who they faced from how they did against them", () => {
    const strength = summarizeSeasonStrength([
      bout({ opponent_percentage: "99.0%", win_loss: "W" }),
      bout({ opponent_percentage: "97.0%", win_loss: "L" }),
      bout({ opponent_percentage: "40.0%", win_loss: "W" }),
    ])
    expect(strength).toMatchObject({ bouts: 3, wins: 2, losses: 1, vsElite: 2, eliteWins: 1, eliteLosses: 1 })
  })

  it("counts an unpercentiled bout toward the record but not the strength figures", () => {
    // Dropping it would quietly rewrite somebody's record.
    const strength = summarizeSeasonStrength([bout({ opponent_percentage: "" }), bout({ opponent_percentage: "99%" })])
    expect(strength.bouts).toBe(2)
    expect(strength.eliteShare).toBe(100) // 1 of 1 percentiled bouts
  })

  it("reads bonus wins from the result", () => {
    const strength = summarizeSeasonStrength([
      bout({ result: "Fall" }),
      bout({ result: "TF" }),
      bout({ result: "Dec" }),
      bout({ result: "MD" }),
    ])
    expect(strength.bonusRate).toBe(75)
  })

  it("returns nulls rather than zeros when there is nothing to measure", () => {
    const strength = summarizeSeasonStrength([])
    expect(strength.averageOpponentPercentile).toBeNull()
    expect(strength.bonusRate).toBeNull()
    expect(strength.eliteShare).toBeNull()
  })
})

describe("summarizeNationalExposure", () => {
  const rows = [
    { event: "Super 32", year: 2026, placement: 3, record: "5-1" },
    { event: "NHSCA", year: 2025, placement: null, record: "2-2" },
  ]

  it("totals the record across national events and keeps the best finish", () => {
    expect(summarizeNationalExposure(rows)).toMatchObject({
      events: 2,
      wins: 7,
      losses: 3,
      bestPlacement: 3,
      bestPlacementEvent: "Super 32",
      latestYear: 2026,
    })
  })

  it("reports never having gone as an absence, not a failure", () => {
    const none = summarizeNationalExposure([])
    expect(none).toMatchObject({ events: 0, bestPlacement: null, latestYear: null })
  })
})

describe("seasonStrengthLine", () => {
  it("leads with the record against elite opponents when there is one", () => {
    const line = seasonStrengthLine(
      summarizeSeasonStrength([
        bout({ opponent_percentage: "99%", win_loss: "W" }),
        bout({ opponent_percentage: "98%", win_loss: "L" }),
      ]),
    )
    expect(line).toContain("1-1")
    expect(line).toContain("top-5%")
  })

  it("says what the schedule was when nobody elite was on it", () => {
    const line = seasonStrengthLine(summarizeSeasonStrength([bout({ opponent_percentage: "50%" })]))
    expect(line).toContain("percentile")
  })

  it("is null with no bouts rather than inventing a claim", () => {
    expect(seasonStrengthLine(summarizeSeasonStrength([]))).toBeNull()
  })
})
