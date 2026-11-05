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

describe("the state names the state tournament", () => {
  const result = { year: 2026, place: 1, classification: "4A", weight_class: "132" }

  it("names North Carolina's when no state is passed, as before", () => {
    expect(buildNchsaaStateRows([result], [])[0]!.event).toBe("NCHSAA 4A State Championships")
  })

  it("names South Carolina's SCHSL, a tournament the NCHSAA does not run", () => {
    expect(buildNchsaaStateRows([result], [], "SC")[0]!.event).toBe("SCHSL 4A State Championships")
  })

  it("does not repeat the body when the classification already is it", () => {
    expect(
      buildNchsaaStateRows([{ ...result, classification: "NCISA" }], [])[0]!.event,
    ).toBe("NCISA State Championships")
    expect(
      buildNchsaaStateRows([{ ...result, classification: "SCISA" }], [], "SC")[0]!.event,
    ).toBe("SCISA State Championships")
  })

  it("carries the name onto the bouts, so a bout does not cite the wrong tournament", () => {
    const rows = buildNchsaaStateRows(
      [result],
      [{ year: 2026, date: null, opponent: "A B", opponentSchool: null, outcome: "W", round: "Finals", weight: "132", method: "Dec", score: "3-1" }],
      "SC",
    )
    expect(rows[0]!.bouts[0]!.eventName).toBe("SCHSL State Championships")
  })
})

describe("an event the state does not sanction", () => {
  it("names West Virginia's girls invitational as one, not a WVSSAC championship", () => {
    /* The flag decides it, not the division's name — sanctioned: false comes from the event. */
    const rows = buildNchsaaStateRows(
      [{ year: 2026, place: 1, classification: "Girls Invitational", weight_class: "130", sanctioned: false, gender: "Girls" }],
      [],
      "WV",
    )
    expect(rows[0]!.event).toBe("WV Girls State Invitational")
  })

  it("calls an unsanctioned event an invitational even if its division is named like a championship", () => {
    const rows = buildNchsaaStateRows(
      [{ year: 2026, place: 1, classification: "Girls", weight_class: "130", sanctioned: false, gender: "Girls" }],
      [],
      "WV",
    )
    expect(rows[0]!.event).toBe("WV Girls State Invitational")
  })

  it("calls a sanctioned event a championship even if its division is named 'Invitational'", () => {
    /* The reverse of the trap: a label is not a fact, and the state sanctions the event. */
    const rows = buildNchsaaStateRows(
      [{ year: 2027, place: 1, classification: "Girls Invitational", weight_class: "130", sanctioned: true }],
      [],
      "WV",
    )
    expect(rows[0]!.event).toBe("WVSSAC Girls Invitational State Championships")
  })

  it("still names West Virginia's boys championship normally", () => {
    const rows = buildNchsaaStateRows(
      [{ year: 2026, place: 1, classification: "Division 1", weight_class: "113" }],
      [],
      "WV",
    )
    expect(rows[0]!.event).toBe("WVSSAC Division 1 State Championships")
  })
})

describe("buildTournamentRows: one row per event", () => {
  const result = (patch: Record<string, unknown>) =>
    ({
      result: { eventKey: "journeymen-fall-classic-2026", eventName: "2026 Journeymen Fall Classic", eventShortName: "Journeymen Fall Classic", eventState: null, eventDate: "2026-10-03", year: 2026, weight: "130B", wins: 2, losses: 1, record: "2-1", placement: null, qualified: false, entrants: 6, club: null, ...patch },
      bouts: [],
      strengthOfWins: [],
      notableWins: [],
    }) as never
  const bout = (patch: Record<string, unknown>) =>
    ({ eventKey: "journeymen-fall-classic-2026", eventName: "2026 Journeymen Fall Classic", year: 2026, weight: "130B", round: "R1", boutOrder: 1, opponentName: "A", opponentClub: null, opponentAthleteId: null, win: true, isBye: false, winType: "DEC", score: "", team: "national", ...patch }) as never

  it("does not print an event again from its bouts when a result row already prints it (Kade Mustin's Journeymen)", () => {
    const rows = buildTournamentRows({ otherTournamentBlocks: [result({})], attachedEventBouts: [bout({}), bout({ win: false })] })
    expect(rows.filter((r) => /journeymen/i.test(r.event))).toHaveLength(1)
  })

  it("prints a family-entered Fargo once, as the bracket's row, keeping the family's placement", () => {
    const submitted = result({ eventKey: "submitted-16u-fargo-nationals-greco-2026", eventName: "16u Fargo Nationals Greco", eventDate: "2026-07-14", weight: "132", placement: 12, record: "4-2", entrants: null })
    const rows = buildTournamentRows({
      otherTournamentBlocks: [submitted],
      attachedEventBouts: [bout({ eventKey: "fargo-2026-16u-gr", eventName: "2026 Fargo 16U Greco-Roman", weight: "132" })],
    })
    const fargo = rows.filter((r) => /fargo/i.test(r.event))
    expect(fargo).toHaveLength(1)
    expect(fargo[0]).toMatchObject({ event: "Fargo · Greco-Roman", placement: "12th" })
  })

  it("keeps a family-entered event we hold no bracket for", () => {
    const rows = buildTournamentRows({ otherTournamentBlocks: [result({ eventKey: "submitted-ironman-2026", eventName: "Ironman", weight: "132" })] })
    expect(rows).toHaveLength(1)
  })
})
