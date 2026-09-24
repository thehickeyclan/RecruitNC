import { describe, expect, it } from "vitest"
import { extractNchsaaStateBouts, isNchsaaIndividualStateEvent } from "@/lib/nchsaa-state-bouts"

describe("NCHSAA state bout extraction", () => {
  it("keeps individual states and excludes regionals and state duals", () => {
    expect(isNchsaaIndividualStateEvent("NCHSAA State Championships")).toBe(true)
    expect(isNchsaaIndividualStateEvent("NCHSAA 3A West Regional")).toBe(false)
    expect(isNchsaaIndividualStateEvent("NCHSAA 3A State Dual Championships")).toBe(false)
  })

  it("builds profile-safe bouts and uses the season when a date has no year", () => {
    expect(extractNchsaaStateBouts([{
      season: "2025-26",
      matches: [
        { date: "2/21", venue: "NCHSAA State Championships", opponent: "Judson Beaver", opponent_school: "Madison", win_loss: "W", result: "Fall", weight: 165 },
        { date: "2/14/2026", venue: "NCHSAA 3A West Regional", opponent: "Other", win_loss: "W" },
      ],
    }])).toEqual([{
      year: 2026,
      date: "2/21",
      weight: "165",
      opponent: "Judson Beaver",
      opponentSchool: "Madison",
      outcome: "W",
      method: "Fall",
    }])
  })
})
