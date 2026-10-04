import { crossStoreNamesWrestler } from "./format-cross-store-athlete-markdown"
import { describe, expect, it } from "vitest"
import { buildHeadToHead, describeBout, toBoutRow, type BoutRow, summarizeBoutsByEvent, buildCareerSummary } from "./tournament-bouts"

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

describe("buildCareerSummary", () => {
  const ev = (year: number, event: string, record = "3-2", placement: number | null = null) => ({
    event, year, weight: "144", wins: 3, losses: 2, record, placement,
  })

  it("separates the four things people ask about, newest year first", () => {
    const c = buildCareerSummary(
      "AZ",
      [{ state: "AZ", season: 2026, classification: "D1", weight: "144", place: 1 }],
      [
        ev(2024, "2024 Super 32", "0-2"),
        ev(2025, "2025 Super 32", "1-2"),
        ev(2025, "2025 Fargo Junior Freestyle"),
        ev(2025, "2025 Fargo Junior Greco-Roman", "1-2"),
        ev(2026, "2026 NHSCA High School Nationals", "5-2", 5),
      ],
    )
    expect(c.state).toBe("AZ")
    expect(c.stateTournament[0]).toMatchObject({ year: 2026, place: 1 })
    expect(c.nhsca.map((e) => e.year)).toEqual([2026])
    expect(c.super32.map((e) => e.year)).toEqual([2025, 2024])
    expect(c.fargoFreestyle).toHaveLength(1)
    expect(c.fargoGreco).toHaveLength(1)
  })

  it("keeps Fargo Greco out of the freestyle line", () => {
    const c = buildCareerSummary("NC", [], [ev(2026, "2026 Fargo 16U Greco-Roman")])
    expect(c.fargoFreestyle).toHaveLength(0)
    expect(c.fargoGreco).toHaveLength(1)
  })

  it("leaves a section empty rather than borrowing from another", () => {
    // Empty must stay empty: the caller says "none on file", which is not "he never went".
    const c = buildCareerSummary("NY", [], [ev(2025, "2025 NHSCA High School Nationals")])
    expect(c.super32).toEqual([])
    expect(c.fargoFreestyle).toEqual([])
    expect(c.stateTournament).toEqual([])
  })

  it("does not file the NHSCA duals as NHSCA Nationals", () => {
    const c = buildCareerSummary("NC", [], [ev(2026, "2026 NHSCA National Duals")])
    expect(c.nhsca).toEqual([])
    expect(c.other).toHaveLength(1)
  })
})

describe("crossStoreNamesWrestler", () => {
  it("rejects a hit that only shares a first name", () => {
    // The hit that cost us Nick Meza: fuzzy historical search answered with Nick Sweet.
    const payload = { total_hits: 1, nchsaa_state: [{ wrestler_name: "Nick Sweet" }] }
    expect(crossStoreNamesWrestler(payload as never, "nick meza")).toBe(false)
  })

  it("accepts the wrestler asked for, including a short form", () => {
    const payload = { total_hits: 3, nchsaa_state: [{ wrestler_name: "Brandon Palmer" }] }
    expect(crossStoreNamesWrestler(payload as never, "brandon palmer")).toBe(true)
    const nicholas = { total_hits: 1, nchsaa_state: [{ wrestler_name: "Nicholas Meza" }] }
    expect(crossStoreNamesWrestler(nicholas as never, "nick meza")).toBe(true)
  })

  it("is false on an empty payload rather than throwing", () => {
    expect(crossStoreNamesWrestler({ total_hits: 0 } as never, "nick meza")).toBe(false)
    expect(crossStoreNamesWrestler({} as never, "")).toBe(false)
  })
})

describe("buildCareerSummary career records", () => {
  const ev = (year: number, event: string, wins: number, losses: number) => ({
    event, year, weight: "170", wins, losses, record: `${wins}-${losses}`, placement: null,
  })

  it("adds up the years so the prose does not have to", () => {
    // Dustin Kohn's four NHSCA years: the model summed these as "18-11". It is 17-9.
    const c = buildCareerSummary("VA", [], [
      ev(2026, "2026 NHSCA High School Nationals", 2, 2),
      ev(2025, "2025 NHSCA High School Nationals", 6, 2),
      ev(2024, "2024 NHSCA High School Nationals", 3, 2),
      ev(2023, "2023 NHSCA High School Nationals", 6, 3),
    ])
    expect(c.careerRecords.nhsca).toBe("17-9")
  })

  it("leaves a record null when we hold nothing, rather than 0-0", () => {
    // "0-0" would read as a tournament he entered and went winless at.
    const c = buildCareerSummary("AZ", [], [ev(2025, "2025 Super 32", 1, 2)])
    expect(c.careerRecords.super32).toBe("1-2")
    expect(c.careerRecords.nhsca).toBeNull()
    expect(c.careerRecords.fargoFreestyle).toBeNull()
  })

  it("keeps the two Fargo styles' records apart", () => {
    const c = buildCareerSummary("AZ", [], [
      ev(2025, "2025 Fargo Junior Freestyle", 3, 2),
      ev(2025, "2025 Fargo Junior Greco-Roman", 1, 2),
    ])
    expect(c.careerRecords.fargoFreestyle).toBe("3-2")
    expect(c.careerRecords.fargoGreco).toBe("1-2")
  })
})
