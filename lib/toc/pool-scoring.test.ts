import { describe, expect, it } from "vitest"
import { maxRemaining, pointsForRound, scoreEntry, type PoolBout } from "./pool-scoring"

/** An eight-person double-elimination weight, the shape the TOC actually runs. */
const BOUTS: PoolBout[] = [
  { boutNumber: 1, roundLabel: "Round 1" },
  { boutNumber: 2, roundLabel: "Round 1" },
  { boutNumber: 3, roundLabel: "Round 1" },
  { boutNumber: 4, roundLabel: "Round 1" },
  { boutNumber: 5, roundLabel: "Consolation R1" },
  { boutNumber: 6, roundLabel: "Consolation R1" },
  { boutNumber: 7, roundLabel: "Winners semifinals" },
  { boutNumber: 8, roundLabel: "Winners semifinals" },
  { boutNumber: 9, roundLabel: "Consolation semifinals" },
  { boutNumber: 10, roundLabel: "Consolation semifinals" },
  { boutNumber: 11, roundLabel: "Championship" },
  { boutNumber: 12, roundLabel: "3rd place" },
]

describe("pointsForRound", () => {
  it("escalates through the championship side", () => {
    expect(pointsForRound("Round 1")).toBe(1)
    expect(pointsForRound("Winners semifinals")).toBe(4)
    expect(pointsForRound("Championship")).toBe(8)
  })

  it("values consolation below the championship side at the same stage", () => {
    expect(pointsForRound("Consolation semifinals")).toBeLessThan(pointsForRound("Winners semifinals"))
    expect(pointsForRound("3rd place")).toBeLessThan(pointsForRound("Championship"))
  })

  it("scores an unrecognised round rather than voiding it", () => {
    // A label we have not seen should undervalue the bout, never silently drop it.
    expect(pointsForRound("Some New Round")).toBe(1)
    expect(pointsForRound(null)).toBe(1)
  })
})

describe("scoreEntry", () => {
  it("scores nothing before any result is entered", () => {
    const s = scoreEntry(BOUTS, { 1: "a", 11: "a" }, {})
    expect(s).toEqual({ points: 0, correct: 0, decidedPicked: 0, decided: 0 })
  })

  it("awards the round's points for a correct pick", () => {
    expect(scoreEntry(BOUTS, { 11: "a" }, { 11: "a" }).points).toBe(8)
    expect(scoreEntry(BOUTS, { 1: "a" }, { 1: "a" }).points).toBe(1)
  })

  it("awards nothing for the wrong wrestler", () => {
    const s = scoreEntry(BOUTS, { 11: "a" }, { 11: "b" })
    expect(s.points).toBe(0)
    expect(s.correct).toBe(0)
    // The bout still counts as decided and picked — the entrant had a go and missed.
    expect(s.decidedPicked).toBe(1)
  })

  it("treats a wrestler who never wrestled the bout the same as a wrong pick", () => {
    // This is what makes "your pick was eliminated earlier" a non-case: it is already zero.
    const s = scoreEntry(BOUTS, { 7: "someone-eliminated-in-round-1" }, { 7: "c" })
    expect(s.points).toBe(0)
  })

  it("does not punish one miss twice", () => {
    // Miss the semifinal, still take the final. A downstream-invalidating rule would zero both.
    const picks = { 7: "wrong", 11: "a" }
    const results = { 7: "c", 11: "a" }
    expect(scoreEntry(BOUTS, picks, results).points).toBe(8)
  })

  it("ignores results for bouts the entrant left blank", () => {
    const s = scoreEntry(BOUTS, { 1: "a" }, { 1: "a", 2: "b", 3: "c" })
    expect(s.correct).toBe(1)
    expect(s.decidedPicked).toBe(1)
    expect(s.decided).toBe(3)
  })

  it("ignores picks for bouts with no result yet", () => {
    const s = scoreEntry(BOUTS, { 1: "a", 11: "a" }, { 1: "a" })
    expect(s.points).toBe(1)
    expect(s.decided).toBe(1)
  })

  it("adds up a full sweep", () => {
    const picks: Record<number, string> = {}
    const results: Record<number, string> = {}
    for (const b of BOUTS) {
      picks[b.boutNumber] = "winner"
      results[b.boutNumber] = "winner"
    }
    // 4×1 + 2×1 + 2×4 + 2×2 + 8 + 4 = 30
    expect(scoreEntry(BOUTS, picks, results).points).toBe(30)
    expect(scoreEntry(BOUTS, picks, results).correct).toBe(12)
  })

  it("ignores empty-string and null picks", () => {
    const s = scoreEntry(BOUTS, { 1: "", 2: null, 3: undefined }, { 1: "a", 2: "b", 3: "c" })
    expect(s.decidedPicked).toBe(0)
    expect(s.points).toBe(0)
  })
})

describe("maxRemaining", () => {
  it("counts every undecided bout", () => {
    expect(maxRemaining(BOUTS, {})).toBe(30)
  })

  it("drops bouts as they are decided", () => {
    expect(maxRemaining(BOUTS, { 11: "a" })).toBe(22)
  })

  it("reaches zero once everything is in", () => {
    const results = Object.fromEntries(BOUTS.map((b) => [b.boutNumber, "x"]))
    expect(maxRemaining(BOUTS, results)).toBe(0)
  })
})
