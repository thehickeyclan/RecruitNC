import { describe, expect, it } from "vitest"
import { bestFinish, placeIn } from "./scouting-report-snapshot"
import { unsupportedSummaryClaims } from "./scouting-report"

describe("scouting report snapshot", () => {
  it("reads a finish from a result's detail line", () => {
    expect(placeIn("7A · 150 · 2nd")).toBe(2)
    expect(placeIn("Champion · 3-0")).toBe(1)
    expect(placeIn("150 · did not place")).toBeNull()
  })
  it("keeps the best finish, newest on a tie", () => {
    const rows = [
      { event: "NCHSAA State Championships", year: 2025, detail: "4A · 126 · 5th", date: null, weight: null },
      { event: "NCHSAA State Championships", year: 2026, detail: "7A · 138 · 4th", date: null, weight: null },
      { event: "Tournament of Champions", year: 2026, detail: "149 · 2nd", date: null, weight: null },
    ]
    expect(bestFinish(rows, /^NCHSAA State Championships$/)).toEqual({ place: 4, year: 2026 })
  })
  it("rejects scouting adjectives whatever the facts say", () => {
    expect(unsupportedSummaryClaims("He is an elite wrestler with a high ceiling.", "elite")).toEqual(
      expect.arrayContaining(['subjective claim "elite"', 'subjective claim "high ceiling"']),
    )
  })
})
