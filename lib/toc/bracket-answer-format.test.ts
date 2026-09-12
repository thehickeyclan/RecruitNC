import { describe, expect, it } from "vitest"
import {
  athleteRunText,
  boutLine,
  bracketText,
  championText,
  outcomeText,
  resolveSlotAthlete,
  seedListText,
  type ResultsForAnswers,
} from "./bracket-answer-format"
import type { TocBracketDraw } from "./bracket-types"

/** Four wrestlers: two semifinals, a final off the winners, a consolation off the losers. */
const draw: TocBracketDraw = {
  weightClass: 141,
  format: "4-man-de",
  bracketSize: 4,
  lockedAt: "2026-09-11T20:00:00Z",
  confirmedCount: 4,
  openSpots: 0,
  isComplete: true,
  participants: [
    { athleteId: "a", invitationId: "i1", seed: 1, name: "Tye Johnson", club: "Fear This", photoUrl: null, graduationYear: 2027 },
    { athleteId: "b", invitationId: "i2", seed: 4, name: "Jaycob Perez", club: "Darkhorse", photoUrl: null, graduationYear: 2027 },
    { athleteId: "c", invitationId: "i3", seed: 3, name: "Sheppard Homan", club: null, photoUrl: null, graduationYear: 2028 },
    { athleteId: "d", invitationId: "i4", seed: 2, name: "Aiden White", club: "Darkhorse", photoUrl: null, graduationYear: 2027 },
  ],
  bouts: [
    { id: "b1", boutNumber: 1, roundLabel: "Round 1", side: "winners", status: "scheduled", winnerAthleteId: null, top: { kind: "athlete", athleteId: "a" }, bottom: { kind: "athlete", athleteId: "b" } },
    { id: "b2", boutNumber: 2, roundLabel: "Round 1", side: "winners", status: "scheduled", winnerAthleteId: null, top: { kind: "athlete", athleteId: "c" }, bottom: { kind: "athlete", athleteId: "d" } },
    { id: "b3", boutNumber: 3, roundLabel: "Championship", side: "placement", status: "scheduled", winnerAthleteId: null, top: { kind: "feeder", boutNumber: 1, label: "Winner Bout 1" }, bottom: { kind: "feeder", boutNumber: 2, label: "Winner Bout 2" } },
    { id: "b4", boutNumber: 4, roundLabel: "3rd place", side: "placement", status: "scheduled", winnerAthleteId: null, top: { kind: "feeder", boutNumber: 1, label: "Loser Bout 1" }, bottom: { kind: "feeder", boutNumber: 2, label: "Loser Bout 2" } },
  ],
} as unknown as TocBracketDraw

const nothing: ResultsForAnswers = { winners: {}, outcomes: {} }
const semisIn: ResultsForAnswers = {
  winners: { 1: "a", 2: "d" },
  outcomes: { 1: { method: "Fall", winnerScore: null, loserScore: null }, 2: { method: "Dec", winnerScore: 7, loserScore: 3 } },
}

describe("seedListText", () => {
  it("answers who the one seed is, in seed order with clubs", () => {
    expect(seedListText(draw)).toBe(
      ["1. Tye Johnson · Fear This", "2. Aiden White · Darkhorse", "3. Sheppard Homan", "4. Jaycob Perez · Darkhorse"].join("\n"),
    )
  })
})

describe("boutLine", () => {
  it("reads as a matchup before it is wrestled", () => {
    expect(boutLine(draw.bouts[0], draw, nothing)).toBe("Bout 1 · Round 1: 1 Tye Johnson vs 4 Jaycob Perez — not wrestled yet")
  })

  it("reads as a result once it is in, with the method", () => {
    expect(boutLine(draw.bouts[0], draw, semisIn)).toBe("Bout 1 · Round 1: 1 Tye Johnson def. 4 Jaycob Perez (Fall)")
  })

  it("carries the score when there is one", () => {
    expect(boutLine(draw.bouts[1], draw, semisIn)).toBe("Bout 2 · Round 1: 2 Aiden White def. 3 Sheppard Homan (Dec 7-3)")
  })

  it("keeps the feeder label until the bout that feeds it is wrestled", () => {
    expect(boutLine(draw.bouts[2], draw, nothing)).toContain("Winner Bout 1 vs Winner Bout 2")
  })

  it("names the wrestlers in a later round once they are known", () => {
    expect(boutLine(draw.bouts[2], draw, semisIn)).toBe(
      "Bout 3 · Championship: 1 Tye Johnson vs 2 Aiden White — not wrestled yet",
    )
  })

  it("follows losers into the consolation bout", () => {
    expect(boutLine(draw.bouts[3], draw, semisIn)).toBe(
      "Bout 4 · 3rd place: 4 Jaycob Perez vs 3 Sheppard Homan — not wrestled yet",
    )
  })
})

describe("resolveSlotAthlete", () => {
  it("knows nobody has advanced before a result", () => {
    expect(resolveSlotAthlete(draw.bouts[2].top, draw, nothing)).toBeNull()
  })

  it("sends the winner forward and the loser down", () => {
    expect(resolveSlotAthlete(draw.bouts[2].top, draw, semisIn)).toBe("a")
    expect(resolveSlotAthlete(draw.bouts[3].top, draw, semisIn)).toBe("b")
  })
})

describe("championText", () => {
  it("says nothing until the final is in", () => {
    expect(championText(draw, semisIn)).toBeNull()
  })

  it("names the champion and how it ended", () => {
    const done: ResultsForAnswers = {
      winners: { ...semisIn.winners, 3: "a" },
      outcomes: { ...semisIn.outcomes, 3: { method: "MD", winnerScore: 12, loserScore: 3 } },
    }
    expect(championText(draw, done)).toBe("Tye Johnson won 141 lbs (MD 12-3 in the final).")
  })
})

describe("athleteRunText", () => {
  it("walks a wrestler's tournament, counting wins and losses", () => {
    const run = athleteRunText(draw, semisIn, "b")
    expect(run.wins).toBe(0)
    expect(run.losses).toBe(1)
    expect(run.lines[0]).toBe("Bout 1 · Round 1: lost to 1 Tye Johnson (Fall)")
    expect(run.lines[1]).toBe("Bout 4 · 3rd place: vs 3 Sheppard Homan — not wrestled yet")
  })

  it("shows a winner's next bout as still to come", () => {
    const run = athleteRunText(draw, semisIn, "a")
    expect(run.wins).toBe(1)
    expect(run.lines.at(-1)).toContain("Championship: vs 2 Aiden White — not wrestled yet")
  })
})

describe("outcomeText", () => {
  it("is empty when nobody recorded how it ended", () => {
    expect(outcomeText(undefined)).toBe("")
    expect(outcomeText({ method: null, winnerScore: null, loserScore: null })).toBe("")
  })
})

describe("bracketText", () => {
  it("lists every bout in order", () => {
    expect(bracketText(draw, nothing).split("\n")).toHaveLength(4)
  })
})
