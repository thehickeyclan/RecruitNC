import { describe, expect, it } from "vitest"
import { extractNchsaaStateBouts, isNchsaaIndividualStateEvent } from "@/lib/nchsaa-state-bouts"

describe("NCHSAA state bout extraction", () => {
  it("keeps individual states and excludes regionals and state duals", () => {
    expect(isNchsaaIndividualStateEvent("NCHSAA State Championships")).toBe(true)
    expect(isNchsaaIndividualStateEvent("NCHSAA 3A West Regional")).toBe(false)
    expect(isNchsaaIndividualStateEvent("NCHSAA 3A State Dual Championships")).toBe(false)
  })

  it("keeps the girls' state tournament and the Trackwrestling label, not girls' regionals", () => {
    expect(isNchsaaIndividualStateEvent("NCHSAA Women`s State Championship")).toBe(true)
    expect(isNchsaaIndividualStateEvent("NCHSAA Women's State Championship")).toBe(true)
    expect(isNchsaaIndividualStateEvent("2026 NCHSAA (NC) State Championships")).toBe(true)
    expect(isNchsaaIndividualStateEvent("NCHSAA Women`s 5A West Regional")).toBe(false)
  })

  it("reads a newest-first season oldest first, so the final is the last bout", () => {
    const venue = "NCHSAA Women`s State Championship"
    const bouts = extractNchsaaStateBouts([{
      season: "2025-26",
      matches: [
        { date: "2/21/2026", venue, opponent: "Finalist", win_loss: "W", result: "Fall" },
        { date: "2/21/2026", venue, opponent: "Semifinalist", win_loss: "W", result: "Fall" },
        { date: "2/21/2026", venue, opponent: "Opener", win_loss: "W", result: "Fall" },
        { date: "2/7/2026", venue: "NCHSAA Women`s 5A West Regional", opponent: "Regional", win_loss: "W" },
        { date: "11/20/2025", venue: "Opener Duals", opponent: "November", win_loss: "W" },
      ],
    }])
    expect(bouts.map((b) => b.opponent)).toEqual(["Opener", "Semifinalist", "Finalist"])
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
