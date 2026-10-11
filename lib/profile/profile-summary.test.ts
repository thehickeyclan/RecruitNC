import { describe, expect, it } from "vitest"
import { accoladePhrases, accoladesFrom, offSeasonEvents, sentenceText, summarySentences, type SummaryRow } from "./profile-summary"

const NOW = new Date("2026-10-11T12:00:00Z")
const row = (event: string, year: number, placement: string | null, sortKey?: string): SummaryRow => ({ event, year, placement, sortKey: sortKey ?? String(year) })
const NONE = accoladesFrom({ stateRows: [], tournamentRows: [] })

describe("accolades", () => {
  it("counts All-Americans at NHSCA, Fargo and the Super 32 only", () => {
    const a = accoladesFrom({
      stateRows: [row("NCHSAA 7A State Championships", 2026, "2nd"), row("NCHSAA 7A State Championships", 2025, "4th")],
      tournamentRows: [
        row("2026 NHSCA High School Nationals", 2026, "5th"),
        row("Fargo · Freestyle", 2026, "7th"),
        row("Super 32 Early Entry", 2026, "3rd"),
        row("Journeymen Fall Classic (OF)", 2025, "Champion"),
        { ...row("2026 NHSCA National Duals", 2026, "1st"), isDuals: true },
      ],
    })
    expect(a.allAmericans).toBe(2)
    expect(accoladePhrases(a)).toEqual(["two-time All-American", "NCHSAA 7A state runner-up"])
  })

  it("says placer, qualifier or nothing, never more than the record holds", () => {
    expect(accoladePhrases(accoladesFrom({ stateRows: [row("NCHSAA 4A State Championships", 2026, "5th")], tournamentRows: [] }))).toEqual(["state placer"])
    expect(accoladePhrases(accoladesFrom({ stateRows: [row("NCHSAA 4A State Championships", 2026, "State Qualifier")], tournamentRows: [] }))).toEqual(["state qualifier"])
    expect(accoladePhrases(NONE)).toEqual([])
  })
})

describe("year-round", () => {
  it("counts events outside November to February in the last twelve months", () => {
    const rows = [
      row("NHSCA Nationals", 2026, null),
      row("Fargo", 2026, null),
      row("Holiday Classic", 2025, null, "2025-12-20"),
      row("Super 32", 2024, null),
    ]
    expect(offSeasonEvents(rows, NOW)).toBe(2)
  })
})

describe("summary sentences", () => {
  it("writes Matt's sentence for a state placer who does it all", () => {
    const a = accoladesFrom({ stateRows: [row("NCHSAA 8A State Championships", 2026, "4th")], tournamentRows: [] })
    const out = summarySentences({
      name: "Luke Richards", gender: "Male", school: "Cardinal Gibbons", club: "RAW", accolades: a,
      scope: "national", styles: ["folkstyle", "freestyle", "greco"], offSeasonEvents: 4,
      lastCompeted: { weight: "132", event: "I-64 Fall Duals", date: "2026-10-10", year: 2026 },
    }).map(sentenceText)
    expect(out).toEqual([
      "Luke Richards competes for Cardinal Gibbons and is part of the RAW club.",
      "He is a state placer who competes nationally, year-round, in folkstyle, freestyle and Greco-Roman.",
      "He last competed at 132 lbs at the I-64 Fall Duals on Oct 10, 2026.",
    ])
  })

  it("leaves out what the record does not support", () => {
    const out = summarySentences({
      name: "Ava Stone", gender: "Female", school: "Millbrook", club: null, accolades: NONE,
      scope: "in-state", styles: ["folkstyle"], offSeasonEvents: 0, lastCompeted: { weight: 120, event: "Fargo", year: 2025 },
    }).map(sentenceText)
    expect(out).toEqual([
      "Ava Stone competes for Millbrook.",
      "She competes in North Carolina in folkstyle.",
      "She last competed at 120 lbs at Fargo in 2025.",
    ])
  })

  it("uses the surname when gender is not set, and an for All-American", () => {
    const a = accoladesFrom({ stateRows: [], tournamentRows: [row("Fargo · Freestyle", 2026, "3rd")] })
    const out = summarySentences({ name: "Sam Lee", school: "Apex", club: "Triangle Wrestling Academy", accolades: a, scope: "national", styles: ["freestyle"], offSeasonEvents: 1 }).map(sentenceText)
    expect(out[0]).toBe("Sam Lee competes for Apex and is part of Triangle Wrestling Academy.")
    expect(out[1]).toBe("Lee is an All-American who competes nationally in freestyle.")
  })

  it("says an NCHSAA, by sound", () => {
    const a = accoladesFrom({ stateRows: [row("NCHSAA 7A State Championships", 2026, "2nd")], tournamentRows: [] })
    const out = summarySentences({ name: "Adam Walker", gender: "Male", school: "Holly Springs", accolades: a, scope: "national", styles: ["folkstyle"], offSeasonEvents: 0 }).map(sentenceText)
    expect(out[1]).toBe("He is an NCHSAA 7A state runner-up who competes nationally in folkstyle.")
  })

  it("says nothing at all for an empty profile", () => {
    expect(summarySentences({ name: "No Data", accolades: NONE, scope: null, styles: [], offSeasonEvents: 0 })).toEqual([])
  })
})
