import { describe, expect, it } from "vitest"
import { buildNchsaaStateRows, buildTournamentRows, inferNchsaaStateRounds } from "@/lib/profile/tournament-rows"

describe("buildNchsaaStateRows", () => {
  it("uses the same expandable tournament-row shape as TOC", () => {
    const rows = buildNchsaaStateRows(
      [{ year: 2026, place: 2, classification: "7A", weight_class: "113" }],
      [
        { year: 2026, date: "2/21/2026", weight: "113", opponent: "Ryder Menard", opponentSchool: "Lake Norman", outcome: "W", method: "SV-1" },
        { year: 2026, date: "2/21/2026", weight: "113", opponent: "Trevelian Hall", opponentSchool: "Lumberton", outcome: "L", method: "Dec" },
      ],
    )
    expect(rows[0]).toMatchObject({
      event: "NCHSAA 7A State Championships",
      year: 2026,
      weight: "113",
      placement: "2nd",
      record: "1-1",
    })
    expect(rows[0].bouts).toHaveLength(2)
    expect(rows[0].bouts.map((bout) => bout.win)).toEqual([true, false])
  })

  it("prefers authoritative CSV rounds and exact scores", () => {
    const [row] = buildNchsaaStateRows(
      [{ year: 2026, place: 2, classification: "7A", weight_class: "113" }],
      [{
        year: 2026,
        date: "2026-02-19",
        weight: "113",
        opponent: "Ryder Menard",
        opponentSchool: "Lake Norman",
        outcome: "W",
        method: "DEC",
        round: "Quarter-Finals",
        score: "6-5 SV",
      }],
    )
    expect(row!.bouts[0]).toMatchObject({ round: "Quarter-Finals", winType: "DEC", score: "6-5 SV" })
  })
})

describe("inferNchsaaStateRounds", () => {
  it("labels a finalist's ordered path quarterfinal, semifinal, final", () => {
    const bout = (outcome: "W" | "L") => ({
      year: 2026,
      date: "2/21/2026",
      weight: "113",
      opponent: "Opponent",
      opponentSchool: null,
      outcome,
      method: "Dec",
    })
    expect(inferNchsaaStateRounds(2, [bout("W"), bout("W"), bout("L")])).toEqual([
      "Quarter-Finals",
      "Semi-Finals",
      "Finals",
    ])
  })

  it("does not invent early rounds when the finish does not prove the path", () => {
    const bouts = [{
      year: 2026,
      date: "2/21/2026",
      weight: "113",
      opponent: "Opponent",
      opponentSchool: null,
      outcome: "L" as const,
      method: "Dec",
    }]
    expect(inferNchsaaStateRounds(null, bouts)).toEqual(["State Championships"])
  })
})

describe("buildTournamentRows Super 32 bouts", () => {
  const s32 = (round: string, opponent: string, outcome: "W" | "L") => ({
    year: 2025,
    date: "2025-10-18",
    weight: "157",
    round,
    opponent,
    opponentState: "PA",
    outcome,
    method: "DEC",
    score: "3-1",
  })

  it("puts each bout on the Super 32 row for its year, in bracket order", () => {
    // Carson Worrick, 2025: a Round of 128 win, then two losses.
    const rows = buildTournamentRows({
      super32Results: [
        { year: 2025, placement: "", record: "1-2", weight: "157" },
        { year: 2024, placement: "", record: "1-2", weight: "144" },
      ],
      super32Bouts: [s32("Consi of 64 #2", "Paxon Legatt", "L"), s32("Round of 128", "Peter Mikedis", "W"), s32("Round of 64", "Sy Strobel", "L")],
    })
    const r2025 = rows.find((r) => r.event === "Super 32" && r.year === 2025)!
    expect(r2025.bouts.map((b) => b.opponentName)).toEqual(["Peter Mikedis", "Sy Strobel", "Paxon Legatt"])
    expect(r2025.bouts[0]).toMatchObject({ eventKey: "super32-2025", eventName: "Super 32", win: true, opponentClub: "PA" })
    // 2024 has no bouts on file and stays a record.
    expect(rows.find((r) => r.event === "Super 32" && r.year === 2024)!.bouts).toEqual([])
  })

  it("does not put Super 32 bouts on the NHSCA row of the same year", () => {
    const rows = buildTournamentRows({
      nhscaResults: [{ year: 2025, placement: "", record: "3-2", weight: "150" }],
      super32Bouts: [s32("Round of 128", "Peter Mikedis", "W")],
    })
    expect(rows.find((r) => r.event === "NHSCA Nationals")!.bouts).toEqual([])
  })
})

describe("attached event bouts", () => {
  it("counts the record off the bouts when the placement row has none", () => {
    // Leah Edwards placed fifth at Super 32 in 2023 with no win or loss count on the row, so her
    // seven matches sat under a line reading "0-0".
    const rows = buildTournamentRows({
      super32Results: [{ year: 2023, placement: "5th", record: "0-0", weight: "106" }] as never[],
      super32Bouts: [
        { year: 2023, date: "2023-10-21", weight: "106", round: "Round of 64", opponent: "A", opponentState: "VA", outcome: "W", method: "Dec", score: "5-2" },
        { year: 2023, date: "2023-10-21", weight: "106", round: "Round of 32", opponent: "B", opponentState: "PA", outcome: "L", method: "Dec", score: "2-5" },
      ] as never[],
    })
    expect(rows[0]).toMatchObject({ event: "Super 32", year: 2023, record: "1-1" })
  })

  it("leaves a stated record alone", () => {
    const rows = buildTournamentRows({
      super32Results: [{ year: 2023, placement: "5th", record: "5-2", weight: "106" }] as never[],
      super32Bouts: [
        { year: 2023, date: "2023-10-21", weight: "106", round: "Round of 64", opponent: "A", opponentState: "VA", outcome: "W", method: "Dec", score: "5-2" },
      ] as never[],
    })
    expect(rows[0].record).toBe("5-2")
  })
})
