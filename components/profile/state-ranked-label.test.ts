import { describe, expect, it } from "vitest"
import { rankedWinsLast12Months, stateRankedLabel, type AppWin } from "./app-profile-rows"

const now = new Date("2026-11-03T12:00:00Z")
const win = (patch: Partial<AppWin>): AppWin => ({ opponent: "X", opponentSchool: null, event: null, date: "2026-10-01", result: null, reason: "ranked", ...patch })

describe("stateRankedLabel", () => {
  it("names the board the opponents are ranked on", () => {
    expect(stateRankedLabel(rankedWinsLast12Months([win({ rankState: "SC" }), win({ rankState: "sc" })], now), "NY")).toBe("2 SC-ranked")
  })
  it("never tells an out-of-state wrestler he has 0 NC-ranked wins", () => {
    expect(stateRankedLabel(rankedWinsLast12Months([], now), "NY")).toBe("0 state-ranked")
    expect(stateRankedLabel(rankedWinsLast12Months([], now), "NC")).toBe("0 NC-ranked")
  })
  it("mixed or unknown boards read state-ranked", () => {
    expect(stateRankedLabel(rankedWinsLast12Months([win({ rankState: "NC" }), win({ rankState: "SC" })], now), "NC")).toBe("2 state-ranked")
    expect(stateRankedLabel(rankedWinsLast12Months([win({})], now), "NC")).toBe("1 state-ranked")
  })
  it("leaves national and old wins out of the state count", () => {
    const r = rankedWinsLast12Months([win({ reason: "national-ranked" }), win({ date: "2025-01-01", rankState: "NC" })], now)
    expect(r).toEqual({ national: 1, state: 0, states: [] })
  })
})
