import { describe, expect, it } from "vitest"
import { compareAthletes, findCommonOpponents, type ComparisonBout, type ComparisonSide } from "./athlete-comparison"

const bout = (opponent: string, won: boolean, over: Partial<ComparisonBout> = {}): ComparisonBout => ({
  opponent, won, event: "NCHSAA State Championships", date: "2026-02-21", ...over,
})
const side = (id: string, name: string, bouts: ComparisonBout[]): ComparisonSide => ({ id, name, bouts })

describe("head-to-head", () => {
  it("is the whole answer when they have met", () => {
    const a = side("a", "Carson Worrick", [bout("Tobin McNair", true, { opponentId: "b", date: "2026-03-26", event: "NHSCA" })])
    const b = side("b", "Tobin McNair", [bout("Carson Worrick", false, { opponentId: "a", date: "2026-03-26", event: "NHSCA" })])
    const c = compareAthletes(a, b)
    expect(c.headToHead!.leftWins).toBe(1)
    expect(c.verdict).toContain("Carson Worrick won the last meeting")
  })

  it("lets the most recent meeting decide a split series", () => {
    const a = side("a", "A", [
      bout("B", true, { opponentId: "b", date: "2025-11-22" }),
      bout("B", false, { opponentId: "b", date: "2026-09-18" }),
    ])
    const b = side("b", "B", [])
    const c = compareAthletes(a, b)
    expect(c.headToHead!.lastMeeting!.winner).toBe("B")
    expect(c.headToHead!.summary).toContain("1-1")
  })
})

describe("common opponents", () => {
  it("finds the wrestler who separates them", () => {
    // The measurement taken through a third wrestler — the only way to compare two who never met.
    const a = side("a", "A", [bout("Jack Kancler", true, { opponentId: "x" })])
    const b = side("b", "B", [bout("Jack Kancler", false, { opponentId: "x" })])
    const common = findCommonOpponents(a, b)
    expect(common).toHaveLength(1)
    expect(common[0]!.decisive).toBe(true)
    expect(compareAthletes(a, b).commonOpponentEdge).toEqual({ left: 1, right: 0, even: 0 })
  })

  it("does not treat each other as a common opponent", () => {
    const a = side("a", "A", [bout("B", true, { opponentId: "b" })])
    const b = side("b", "B", [bout("A", false, { opponentId: "a" })])
    expect(findCommonOpponents(a, b)).toEqual([])
  })

  it("matches an opponent by name when we hold no id for them", () => {
    // Most opponents at a national event are out of state and have no profile here.
    const a = side("a", "A", [bout("Zack Aquila", true)])
    const b = side("b", "B", [bout("zack aquila", false)])
    expect(findCommonOpponents(a, b)[0]!.decisive).toBe(true)
  })

  it("calls a split a split rather than picking a side", () => {
    const a = side("a", "A", [bout("X", true, { opponentId: "x" }), bout("X", false, { opponentId: "x" })])
    const b = side("b", "B", [bout("X", false, { opponentId: "x" })])
    expect(findCommonOpponents(a, b)[0]!.leftResult).toBe("split")
  })

  it("puts the opponents who separate them first", () => {
    const a = side("a", "A", [bout("Shared Win", true, { opponentId: "w" }), bout("Splitter", true, { opponentId: "s" })])
    const b = side("b", "B", [bout("Shared Win", true, { opponentId: "w" }), bout("Splitter", false, { opponentId: "s" })])
    expect(findCommonOpponents(a, b)[0]!.opponent).toBe("Splitter")
  })
})

describe("when nothing separates them", () => {
  it("says so rather than inventing a winner", () => {
    const c = compareAthletes(side("a", "A", [bout("X", true)]), side("b", "B", [bout("Y", true)]))
    expect(c.verdict).toContain("no opponent in common")
    expect(c.headToHead).toBeNull()
  })

  it("admits an even record against shared opponents", () => {
    const a = side("a", "A", [bout("X", true, { opponentId: "x" }), bout("Y", false, { opponentId: "y" })])
    const b = side("b", "B", [bout("X", false, { opponentId: "x" }), bout("Y", true, { opponentId: "y" })])
    expect(compareAthletes(a, b).verdict).toContain("Nothing here separates them")
  })
})
