import { describe, expect, it } from "vitest"
import { buildHeadToHead, describeBout, toBoutRow, type BoutRow } from "./tournament-bouts"

const bout = (over: Partial<BoutRow> = {}): BoutRow => ({
  event: "2026 NHSCA High School Nationals",
  year: 2026, date: "2026-03-14", round: "Consi-Semis", weight: "160",
  opponent: "Tobin McNair", opponentTeam: "NC", outcome: "W", method: "DEC", score: "3-2", ...over,
})

describe("describeBout", () => {
  it("reads as a sentence a coach would say", () => {
    expect(describeBout(bout(), "Carson Worrick"))
      .toBe("Carson Worrick beat Tobin McNair DEC 3-2 at 2026 NHSCA High School Nationals (Consi-Semis)")
  })

  it("does not invent detail it does not have", () => {
    expect(describeBout(bout({ method: null, score: null, round: null })))
      .toBe("beat Tobin McNair at 2026 NHSCA High School Nationals")
  })
})

describe("buildHeadToHead", () => {
  it("answers the question rather than listing rows", () => {
    const answer = buildHeadToHead("Carson Worrick", "Tobin McNair", [bout()])
    expect(answer.record).toBe("1-0")
    expect(answer.lastMeeting!.winner).toBe("Carson Worrick")
    expect(answer.summary).toContain("1-0")
  })

  it("lets the most recent meeting decide a split series", () => {
    // A ranking argument turns on the latest result, not the aggregate.
    const answer = buildHeadToHead("A", "B", [
      bout({ date: "2025-12-22", outcome: "W" }),
      bout({ date: "2026-09-18", outcome: "L" }),
    ])
    expect(answer.record).toBe("1-1")
    expect(answer.lastMeeting!.winner).toBe("B")
    expect(answer.meetings[0]!.date).toBe("2026-09-18")
  })

  it("says an absence is an absence of data, not of the event", () => {
    const answer = buildHeadToHead("A", "B", [])
    expect(answer.summary).toContain("not that none happened")
    expect(answer.lastMeeting).toBeNull()
  })
})

describe("toBoutRow", () => {
  it("survives a row with the optional fields empty", () => {
    const row = toBoutRow({ opponent_name: "Someone", win: false })
    expect(row.outcome).toBe("L")
    expect(row.event).toBe("Unknown event")
    expect(row.score).toBeNull()
  })
})
