import { describe, expect, it } from "vitest"
import { buildHeadToHead, compareAthletes, findCommonOpponents, type ComparisonBout, type ComparisonSide } from "./athlete-comparison"

const bout = (opponent: string, won: boolean, over: Partial<ComparisonBout> = {}): ComparisonBout => ({
  opponent, won, event: "NCHSAA State Championships", date: "2026-02-21", ...over,
})
const side = (id: string, name: string, bouts: ComparisonBout[]): ComparisonSide => ({ id, name, bouts })
/** Fixed so the 12-month window does not move under the tests. */
const NOW = Date.parse("2026-10-06")

describe("head-to-head", () => {
  it("is the whole answer when they have met", () => {
    const a = side("a", "Carson Worrick", [bout("Tobin McNair", true, { opponentId: "b", date: "2026-03-26", event: "NHSCA" })])
    const b = side("b", "Tobin McNair", [bout("Carson Worrick", false, { opponentId: "a", date: "2026-03-26", event: "NHSCA" })])
    const c = compareAthletes(a, b, NOW)
    expect(c.headToHead!.leftWins).toBe(1)
    expect(c.headToHead!.rightWins).toBe(0)
    expect(c.headToHead!.edge).toBe("left")
    expect(c.verdict).toContain("Carson Worrick won the last meeting")
  })

  it("lets the most recent meeting decide a split series", () => {
    const a = side("a", "A", [
      bout("B", true, { opponentId: "b", date: "2025-11-22" }),
      bout("B", false, { opponentId: "b", date: "2026-09-18" }),
    ])
    const b = side("b", "B", [])
    const c = compareAthletes(a, b, NOW)
    expect(c.headToHead!.lastMeeting!.winner).toBe("B")
    expect(c.headToHead!.summary).toContain("1-1")
    expect(c.headToHead!.edge).toBe("right")
  })

  it("finds a meeting only the other wrestler's record holds, from the right side", () => {
    const a = side("a", "A", [])
    const b = side("b", "B", [bout("A", true, { opponentId: "a", date: "2026-02-20" })])
    const h = buildHeadToHead(a, b, NOW)!
    expect(h.leftWins).toBe(0)
    expect(h.rightWins).toBe(1)
    expect(h.edge).toBe("right")
  })

  it("counts one bout once when the season JSON and the tournament table both carry it", () => {
    const a = side("a", "Adam Walker", [
      bout("Luke Richards", true, { opponentId: "b", date: "2026-02-20", method: "DEC", score: "4-2" }),
      bout("Luke Richards", true, { date: "2026-02-20" }),
    ])
    const b = side("b", "Luke Richards", [bout("Adam Walker", false, { opponentId: "a", date: "2026-02-20" })])
    const h = buildHeadToHead(a, b, NOW)!
    expect(h.meetings).toHaveLength(1)
    expect(h.meetings[0]!.score).toBe("4-2")
  })

  it("shows an old meeting but gives no edge for it", () => {
    // Two seasons ago, a different weight and a different stage of growing up.
    const a = side("a", "A", [bout("B", true, { opponentId: "b", date: "2024-12-01" })])
    const h = buildHeadToHead(a, side("b", "B", []), NOW)!
    expect(h.leftWins).toBe(1)
    expect(h.edge).toBeNull()
    expect(h.summary).toContain("more than 12 months ago")
  })

  it("never takes a namesake when the bout names somebody else by id", () => {
    const a = side("a", "A", [bout("John Smith", true, { opponentId: "someone-else", date: "2026-02-20" })])
    expect(buildHeadToHead(a, side("b", "John Smith", []), NOW)).toBeNull()
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

  it("counts an opponent once when one record has his id and the other only his name", () => {
    // Stephen Cross, 2026 I-64 Spring Duals: bout table with his id, season record by name.
    const a = side("a", "Daniel McDermott", [
      bout("Stephen Cross", true, { opponentId: "x", date: "2026-03-14" }),
      bout("Stephen Cross", true, { date: "3/14/2026" }),
    ])
    const b = side("b", "Luke Richards", [
      bout("Stephen Cross", true, { opponentId: "x", date: "2026-03-14" }),
      bout("Stephen Cross", true, { date: "3/14/2026" }),
      bout("Stephen Cross", true, { date: "11/15/2025" }),
    ])
    const common = findCommonOpponents(a, b)
    expect(common).toHaveLength(1)
    expect(common[0]!.key).toBe("id:x")
    expect(common[0]!.leftBouts).toHaveLength(1)
    expect(common[0]!.rightBouts).toHaveLength(2)
  })

  it("never treats a forfeit, a bye or a school name as an opponent", () => {
    const a = side("a", "A", [bout("Forfeit", true), bout("Bye", true), bout("Opponent1", true), bout("Hayesville", true)])
    const b = side("b", "B", [bout("Forfeit", false), bout("Bye", true), bout("Opponent1", false), bout("Hayesville", false)])
    expect(findCommonOpponents(a, b)).toEqual([])
  })

  it("keeps two different wrestlers of one name apart", () => {
    const a = side("a", "A", [bout("John Smith", true, { opponentId: "x" }), bout("John Smith", false, { opponentId: "y" })])
    const b = side("b", "B", [bout("John Smith", false)])
    // The name could be either id, so it joins neither.
    expect(findCommonOpponents(a, b)).toEqual([])
  })

  it("calls a split a split rather than picking a side", () => {
    const a = side("a", "A", [bout("Xavier Hill", true, { opponentId: "x" }), bout("Xavier Hill", false, { opponentId: "x" })])
    const b = side("b", "B", [bout("Xavier Hill", false, { opponentId: "x" })])
    expect(findCommonOpponents(a, b)[0]!.leftResult).toBe("split")
  })

  it("puts the opponents who separate them first", () => {
    const a = side("a", "A", [bout("Shared Win", true, { opponentId: "w" }), bout("Sam Splitter", true, { opponentId: "s" })])
    const b = side("b", "B", [bout("Shared Win", true, { opponentId: "w" }), bout("Sam Splitter", false, { opponentId: "s" })])
    expect(findCommonOpponents(a, b)[0]!.opponent).toBe("Sam Splitter")
  })
})

describe("when nothing separates them", () => {
  it("says so rather than inventing a winner", () => {
    const c = compareAthletes(side("a", "A", [bout("Xavier Hill", true)]), side("b", "B", [bout("Yusuf Ali", true)]))
    expect(c.verdict).toContain("no opponent in common")
    expect(c.headToHead).toBeNull()
  })

  it("admits an even record against shared opponents", () => {
    const a = side("a", "A", [bout("Xavier Hill", true, { opponentId: "x" }), bout("Yusuf Ali", false, { opponentId: "y" })])
    const b = side("b", "B", [bout("Xavier Hill", false, { opponentId: "x" }), bout("Yusuf Ali", true, { opponentId: "y" })])
    expect(compareAthletes(a, b).verdict).toContain("Nothing here separates them")
  })
})
