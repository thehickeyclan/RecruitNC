import { describe, expect, it } from "vitest"
import { inSeasonBoutsOnly, isOutOfSeasonBout } from "./out-of-season-bouts"

describe("isOutOfSeasonBout", () => {
  it("catches the Interstate 64 Spring Duals as it is filed", () => {
    expect(isOutOfSeasonBout({ venue: "Interstate 64 Spring Duals", date: "3/14/2026" })).toBe(true)
  })

  it("keeps a state championship that happens to run in March", () => {
    /** Abdeen Zaggout wrestled the New York state final on 1 March; that is his season. */
    expect(isOutOfSeasonBout({ venue: "NYSPHSAA State Championships", date: "3/1/2025" })).toBe(false)
  })

  it("keeps ordinary in-season events", () => {
    for (const venue of ["NCHSAA State Championships", "Gate City Grapple", "Dual", "Red Devil Super Duals"]) {
      expect(isOutOfSeasonBout({ venue })).toBe(false)
    }
  })

  it("reads the event off whichever field carries it", () => {
    expect(isOutOfSeasonBout({ event: "I-64 Spring Duals" })).toBe(true)
    expect(isOutOfSeasonBout({ tournament: "Summer Duals" })).toBe(true)
  })

  it("says nothing about a bout with no event recorded", () => {
    expect(isOutOfSeasonBout({ date: "3/14/2026" })).toBe(false)
    expect(isOutOfSeasonBout(null)).toBe(false)
  })

  it("filters a log without disturbing the order of what is left", () => {
    const bouts = [
      { venue: "Dual", opponent: "A" },
      { venue: "Interstate 64 Spring Duals", opponent: "B" },
      { venue: "NCHSAA State Championships", opponent: "C" },
    ]
    expect(inSeasonBoutsOnly(bouts).map((b) => b.opponent)).toEqual(["A", "C"])
  })
})
