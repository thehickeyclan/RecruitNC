import { describe, expect, it } from "vitest"
import { buildHeadToHead, describeBout, toBoutRow, type BoutRow, summarizeBoutsByEvent } from "./tournament-bouts"

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

describe("summarizeBoutsByEvent", () => {
  const bout = (year: number, event: string, round: string, outcome: "W" | "L", weight = "170") => ({
    event, year, date: null, round, weight, opponent: "x", opponentTeam: null, outcome, method: null, score: null,
  })

  it("gives each event its record and reads the finish off the placement round", () => {
    // Micah Engelman, 2025 NHSCA: 5-2 and fifth, which is what a reader wants before ten bouts.
    const out = summarizeBoutsByEvent([
      bout(2025, "2025 NHSCA High School Nationals", "Round of 32", "W"),
      bout(2025, "2025 NHSCA High School Nationals", "Round of 16", "W"),
      bout(2025, "2025 NHSCA High School Nationals", "Quarter-Finals", "L"),
      bout(2025, "2025 NHSCA High School Nationals", "Consi of 8 #2", "W"),
      bout(2025, "2025 NHSCA High School Nationals", "Consi of 4", "W"),
      bout(2025, "2025 NHSCA High School Nationals", "Consi-Semis", "L"),
      bout(2025, "2025 NHSCA High School Nationals", "5th Place", "W"),
    ])
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ record: "5-2", placement: 5, weight: "170" })
  })

  it("losing the placement match is the lower place", () => {
    const [third] = summarizeBoutsByEvent([bout(2026, "E", "3rd Place", "W")])
    const [fourth] = summarizeBoutsByEvent([bout(2026, "E", "3rd Place", "L")])
    expect(third!.placement).toBe(3)
    expect(fourth!.placement).toBe(4)
  })

  it("leaves placement null when he never reached a placement match", () => {
    // Null is "did not get there", not "we are missing it".
    const [only] = summarizeBoutsByEvent([bout(2026, "E", "Round of 64", "L")])
    expect(only!.placement).toBeNull()
    expect(only!.record).toBe("0-1")
  })

  it("keeps each year of the same event apart, newest first", () => {
    const out = summarizeBoutsByEvent([
      bout(2025, "NHSCA", "Round of 64", "W"),
      bout(2026, "NHSCA", "Round of 64", "L"),
    ])
    expect(out.map((e) => e.year)).toEqual([2026, 2025])
  })
})
