import { describe, expect, it } from "vitest"
import {
  HEAD_TO_HEAD_WINDOW_DAYS,
  datedMeetingsAgainst,
  holdsHeadToHeadEdge,
  resolvePairing,
  type DatedMeeting,
} from "@/lib/head-to-head"

const DAY = 86_400_000
const NOW = Date.parse("2026-09-06T12:00:00Z")

function meeting(daysAgo: number, won: boolean, summary = ""): DatedMeeting {
  return { at: NOW - daysAgo * DAY, won, summary: summary || (won ? "won" : "lost") }
}

describe("resolvePairing — the 12 month window", () => {
  it("counts a meeting inside the window", () => {
    expect(resolvePairing([meeting(30, true)], NOW)).toMatchObject({ wins: 1, losses: 0 })
  })

  it("drops a meeting older than 12 months", () => {
    const old = meeting(HEAD_TO_HEAD_WINDOW_DAYS + 30, true)
    expect(resolvePairing([old], NOW)).toMatchObject({ wins: 0, losses: 0, lastMeetingWon: null })
  })

  it("keeps the recent half of a series that straddles the window", () => {
    const pairing = resolvePairing(
      [meeting(HEAD_TO_HEAD_WINDOW_DAYS + 60, true), meeting(10, false)],
      NOW,
    )
    expect(pairing).toMatchObject({ wins: 0, losses: 1, lastMeetingWon: false })
  })

  it("ignores a meeting with no usable date", () => {
    expect(resolvePairing([{ at: null, won: true, summary: "won" }], NOW)).toMatchObject({
      wins: 0,
      losses: 0,
    })
  })
})

describe("resolvePairing — the latest meeting decides", () => {
  it("gives the edge to whoever won most recently in a split series", () => {
    // Walker lost in January and beat the same opponent at the September qualifier.
    const pairing = resolvePairing([meeting(230, false), meeting(1, true)], NOW)
    expect(pairing).toMatchObject({ wins: 1, losses: 1, lastMeetingWon: true, decidedByRecency: true })
    expect(holdsHeadToHeadEdge(pairing)).toBe(true)
  })

  it("gives the edge the other way when the recent bout was the loss", () => {
    const pairing = resolvePairing([meeting(230, true), meeting(1, false)], NOW)
    expect(pairing).toMatchObject({ wins: 1, losses: 1, lastMeetingWon: false })
    expect(holdsHeadToHeadEdge(pairing)).toBe(false)
  })

  it("lets a recent loss outweigh an older winning record", () => {
    const pairing = resolvePairing([meeting(200, true), meeting(180, true), meeting(2, false)], NOW)
    expect(pairing).toMatchObject({ wins: 2, losses: 1, lastMeetingWon: false })
    expect(holdsHeadToHeadEdge(pairing)).toBe(false)
  })

  it("collapses the same bout arriving from more than one source", () => {
    // The athlete's row, the opponent's mirrored row, and the qualifier table all carry it.
    const sameDay = [meeting(1, true), meeting(1, true), meeting(1, true)]
    expect(resolvePairing(sameDay, NOW)).toMatchObject({ wins: 1, losses: 0 })
  })

  it("falls back to the aggregate when no meeting is dated", () => {
    expect(holdsHeadToHeadEdge({ wins: 2, losses: 1, lastMeetingWon: null })).toBe(true)
    expect(holdsHeadToHeadEdge({ wins: 0, losses: 1 })).toBe(false)
  })
})

describe("datedMeetingsAgainst", () => {
  const bouts = [
    { opponent_name: "Luke Richards", win_loss: "L", date: "1/15/2026", tournament: "Cardinal Gibbons Duals" },
    { opponent: "Luke Richards", win_loss: "W", date: "3/1/2026" },
    { opponent_name: "Someone Else", win_loss: "W", date: "2/2/2026" },
  ]

  it("reads both opponent key spellings and skips other opponents", () => {
    const meetings = datedMeetingsAgainst(bouts, "Luke Richards")
    expect(meetings).toHaveLength(2)
    expect(meetings.map((m) => m.won)).toEqual([false, true])
  })

  it("mirrors the perspective when reading the opponent's own row", () => {
    const meetings = datedMeetingsAgainst(bouts, "Luke Richards", true)
    expect(meetings.map((m) => m.won)).toEqual([true, false])
  })

  it("carries the date so the meeting can be windowed and ordered", () => {
    const [first] = datedMeetingsAgainst(bouts, "Luke Richards")
    expect(first!.at).toBe(Date.parse("1/15/2026"))
    expect(first!.summary).toContain("1/15/2026")
  })

  it("skips a bout that is neither a win nor a loss", () => {
    expect(datedMeetingsAgainst([{ opponent: "Luke Richards", win_loss: "", date: "1/1/2026" }], "Luke Richards")).toEqual([])
  })
})
