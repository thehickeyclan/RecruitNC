import { describe, expect, it } from "vitest"
import { bestWinFacts, bestWinsWritingNotes, isBestWinsQuestion } from "./data-dawg-best-wins"
import type { SignificantWin } from "./significant-wins"

describe("isBestWinsQuestion", () => {
  it.each([
    "What major wins does he have",
    "What’s one of his best wins",
    "what are his biggest wins",
    "does he have any big wins",
    "who has he beaten",
    "Has she beaten anyone ranked",
    "any wins over state placers?",
    "Josiah McCowan notable victories",
  ])("catches %s", (q) => expect(isBestWinsQuestion(q)).toBe(true))

  it.each([
    "how many wins does he have",
    "what is his record",
    "who won the TOC at 132",
    "Josiah McCowan",
    "what was his record at Super 32",
    "who is the best wrestler at North Stanly",
  ])("leaves %s alone", (q) => expect(isBestWinsQuestion(q)).toBe(false))
})

const win = (over: Partial<SignificantWin>): SignificantWin => ({
  opponent: "Gabriel Robinson",
  opponentSchool: "Lincolnton",
  event: "NCHSAA State Championships",
  date: "2026-02-19",
  result: "DEC 5-0",
  weight: 157,
  reason: "state-placer",
  stateLabel: "2026 NCHSAA 3A State 4th",
  opponentGraduationYear: null,
  opponentRanking: null,
  ...over,
})

describe("bestWinFacts", () => {
  it("hands over the opponent, his credential and the bout", () => {
    expect(bestWinFacts([win({})]).wins[0]).toEqual({
      opponent: "Gabriel Robinson",
      opponent_team: "Lincolnton",
      opponent_credential: "2026 NCHSAA 3A State 4th",
      event: "NCHSAA State Championships",
      date: "2026-02-19",
      result: "DEC 5-0",
    })
  })

  it("never carries an opponent's private NC ranking, and drops a win known only by it", () => {
    const out = bestWinFacts([
      win({ reason: "ranked", opponentRanking: 4 }),
      win({ opponent: "Only Ranked", reason: "ranked", opponentRanking: 12, stateLabel: undefined }),
    ])
    expect(out.total).toBe(1)
    expect(JSON.stringify(out)).not.toMatch(/opponentRanking|"4"|#4|12/)
  })

  it("caps the list and reports the full count", () => {
    const out = bestWinFacts(Array.from({ length: 14 }, (_, i) => win({ opponent: `Opponent ${i}` })))
    expect(out.wins).toHaveLength(10)
    expect(out.total).toBe(14)
    expect(bestWinsWritingNotes(out.total, out.wins.length).join(" ")).toContain("14 such wins")
  })
})

describe("bestWinsWritingNotes", () => {
  it("says there are none without saying we hold no results", () => {
    const notes = bestWinsWritingNotes(0, 0).join(" ")
    expect(notes).toContain("we hold no wins over a state placer")
    expect(notes).toContain("Do NOT say we have no results")
  })
})
