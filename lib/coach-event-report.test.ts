import { describe, expect, it } from "vitest"
import {
  analyzeBrackets,
  buildEventReport,
  renderCoachEventReportEmail,
  REPORT_EVENTS,
  roundRank,
  type FieldRow,
  type ReportAthleteInput,
  type ReportEvent,
} from "@/lib/coach-event-report"
import type { OtherTournamentBout } from "@/lib/other-tournaments"
import type { OpponentIndex } from "@/lib/significant-wins"

const SINGLE: ReportEvent = {
  key: "s32-test",
  name: "2025 Super 32",
  date: "2025-10-18",
  format: "single-bracket",
  sources: [{ eventKey: "super32-2025", sourceFiles: ["main.csv", "girls.csv"], placementsCount: true }],
}

const TIERED: ReportEvent = {
  key: "jm-test",
  name: "2026 Journeymen Fall Classic",
  date: "2026-10-03",
  format: "tiered",
  sources: [
    { eventKey: "jm-2026", sourceFiles: ["jmmain.csv"], placementsCount: true },
    { eventKey: "jm-2026-of", sourceFiles: ["jm-of.csv"], placementsCount: false, bracketLabel: "Overflow" },
  ],
}

type B = [round: string, opponent: string, win: boolean, extra?: Partial<OtherTournamentBout>]

function bouts(eventKey: string, sourceFile: string, weight: string, list: B[], date = "2025-10-18"): OtherTournamentBout[] {
  return list.map(([round, opponent, win, extra], i) => ({
    eventKey,
    eventName: eventKey,
    year: Number(date.slice(0, 4)),
    weight,
    round,
    boutOrder: (i + 1) * 10,
    opponentName: opponent,
    opponentClub: null,
    opponentAthleteId: null,
    win,
    isBye: false,
    winType: "DEC",
    score: "3-1",
    sourceFile,
    eventDate: date,
    ...extra,
  }))
}

function athlete(id: string, name: string, list: OtherTournamentBout[], extra?: Partial<ReportAthleteInput>): ReportAthleteInput {
  return { id, name, gender: "Male", graduationYear: 2027, school: "Topsail", bouts: list, ...extra }
}

/** The field: every athlete's own rows, as the bracket file holds them. */
function field(...entries: Array<[name: string, list: OtherTournamentBout[]]>): FieldRow[] {
  return entries.flatMap(([name, list]) =>
    list.map((b) => ({
      eventKey: b.eventKey,
      sourceFile: b.sourceFile ?? null,
      athleteName: name,
      weight: b.weight,
      round: b.round,
      boutOrder: b.boutOrder,
      opponentName: b.opponentName,
      win: b.win,
      isBye: b.isBye,
    })),
  )
}

const NO_INDEX = null

describe("buildEventReport - single bracket (Super 32)", () => {
  const placer = bouts("super32-2025", "main.csv", "150", [
    ["Round of 32", "A One", true],
    ["Round of 16", "Joe Joyce", false],
    ["Consi of 8 #1", "B Two", true],
    ["Consi-Semis", "C Three", true],
    ["3rd Place", "Rocco C", false],
  ])
  const unplaced = bouts("super32-2025", "main.csv", "157", [
    ["Round of 64", "D Four", true],
    ["Round of 32", "E Five", false],
    ["Consi of 32 #1", "F Six", false],
  ])

  const reports = buildEventReport({
    event: SINGLE,
    athletes: [
      athlete("dnc", "Zed Absent", []),
      athlete("u", "Una Placed", unplaced),
      athlete("p", "Pat Placer", placer),
    ],
    field: field(["Pat Placer", placer], ["Una Placed", unplaced]),
    index: NO_INDEX,
    lossesVisible: true,
  })

  it("returns every starred wrestler, best finish first and non-competitors last", () => {
    expect(reports.map((r) => r.athleteId)).toEqual(["p", "u", "dnc"])
  })

  it("derives the place from the placement-round bout: losing the 3rd place match is 4th", () => {
    expect(reports[0]).toMatchObject({ competed: true, place: 4, placement: "4th", record: { wins: 3, losses: 2 }, weight: "150" })
    expect(reports[0]!.summary).toBe("He went 3-2 at 150 and placed 4th.")
  })

  it("states no place for a wrestler who never reached a placement match", () => {
    expect(reports[1]).toMatchObject({ competed: true, place: null, placement: null, record: { wins: 1, losses: 2 }, weight: "157" })
  })

  it("keeps a wrestler who did not compete, saying so", () => {
    expect(reports[2]).toMatchObject({ competed: false, place: null, bouts: [], summary: "Did not compete at 2025 Super 32." })
  })

  it("will not take a 1st place match after a loss as a title", () => {
    const odd = bouts("super32-2025", "main.csv", "120", [
      ["Round of 32", "A", false],
      ["Finals", "B", true],
    ])
    const [r] = buildEventReport({ event: SINGLE, athletes: [athlete("x", "X Y", odd)], field: field(["X Y", odd]), index: NO_INDEX, lossesVisible: true })
    expect(r!.place).toBeNull()
    expect(r!.placementNote).toMatch(/cannot be a main-bracket placement match/)
  })
})

describe("event identity", () => {
  it("reads only the event's own source files, and one bout from two files once", () => {
    const own = bouts("super32-2025", "girls.csv", "148", [["Round of 32", "Kim M", true]])
    const dup = bouts("super32-2025", "main.csv", "148", [["Round of 32", "Kim M", true]])
    const stray = bouts("super32-2025", "someone-elses.csv", "148", [["Round of 16", "Kesi T", false]])
    const otherEvent = bouts("super32-2024", "main.csv", "148", [["Round of 16", "Old Foe", false]])
    const [r] = buildEventReport({
      event: SINGLE,
      athletes: [athlete("f", "Faith B", [...own, ...dup, ...stray, ...otherEvent], { gender: "Female" })],
      field: [],
      index: NO_INDEX,
      lossesVisible: true,
    })
    expect(r!.record).toEqual({ wins: 1, losses: 0 })
    expect(r!.summary).toBe("She went 1-0 at 148.")
  })

  it("uses the weight wrestled at the event: the input carries no weight class to fall back on", () => {
    const list = bouts("super32-2025", "main.csv", "152", [["Round of 32", "A", true]])
    const [r] = buildEventReport({ event: SINGLE, athletes: [athlete("a", "Jake A", list)], field: [], index: NO_INDEX, lossesVisible: true })
    expect(r!.weight).toBe("152")
  })

  it("drops middle school bouts", () => {
    const list = bouts("super32-2025", "main.csv", "106", [["Round of 32", "A", true]])
    // Class of 2030 starts high school on 1 June 2026; an October 2025 bout is eighth grade.
    const [r] = buildEventReport({
      event: SINGLE,
      athletes: [athlete("m", "Young One", list, { graduationYear: 2030 })],
      field: [],
      index: NO_INDEX,
      lossesVisible: true,
    })
    expect(r!.competed).toBe(false)
  })

  it("holds back bouts linked to him that his profile does not show (the Carson Owens trap)", () => {
    const list = bouts("super32-2025", "main.csv", "140", [["Round of 32", "A", true]])
    const [r] = buildEventReport({
      event: SINGLE,
      athletes: [athlete("c", "Carson O", list, { profileResults: [] })],
      field: [],
      index: NO_INDEX,
      lossesVisible: true,
    })
    expect(r).toMatchObject({ competed: false, unverifiedBouts: 1, summary: "No verified result at 2025 Super 32." })
  })

  it("keeps bouts under the profile's result at that weight", () => {
    const list = [
      ...bouts("super32-2025", "main.csv", "190", [["Round of 32", "A", true]]),
      ...bouts("super32-2025", "main.csv", "140", [["Round of 32", "B", true]]),
    ]
    const [r] = buildEventReport({
      event: SINGLE,
      athletes: [
        athlete("c", "Carson O", list, {
          profileResults: [
            { eventKey: "super32-2025", weight: "190" },
            { eventKey: "super32-2025", weight: "215" },
          ],
        }),
      ],
      field: [],
      index: NO_INDEX,
      lossesVisible: true,
    })
    expect(r).toMatchObject({ competed: true, weight: "190", unverifiedBouts: 1, record: { wins: 1, losses: 0 } })
  })

  it("Journeymen and Super 32 are named by their imports", () => {
    expect(REPORT_EVENTS["journeymen-fall-classic-2026"]!.sources.map((s) => s.sourceFiles)).toEqual([["jmmain-boys.csv"], ["jm26-boys.csv"]])
    expect(REPORT_EVENTS["super32-2025"]!.sources[0]!.eventKey).toBe("super32-2025")
  })
})

describe("tiered brackets (Journeymen)", () => {
  // 152 at Journeymen 2026, cut down: two pre-rounds sort the weight into a 2-0 bracket and a 1-1 one.
  const top = (name: string, list: B[]) => [name, bouts("jm-2026", "jmmain.csv", "152", list, "2026-10-03")] as const
  const munn = top("Ryan Munn", [["Round of 32", "p1", true], ["Round of 16", "p2", true], ["Semi-Finals", "Chance Ruble", true], ["Finals", "Aiden Kunes", true]])
  const kunes = top("Aiden Kunes", [["Round of 32", "p3", true], ["Round of 16", "p4", true], ["Semi-Finals", "Obrien", true], ["Finals", "Ryan Munn", false]])
  const ruble = top("Chance Ruble", [["Round of 32", "p5", true], ["Round of 16", "p6", true], ["Semi-Finals", "Ryan Munn", false], ["3rd Place", "Obrien", true]])
  const boxley = top("Lukas Boxley", [["Round of 32", "p7", false], ["Round of 16", "p8", true], ["Semi-Finals", "Jake Causey", true], ["Finals", "Vince V", true]])
  const causey = top("Jake Causey", [["Round of 32", "p9", false], ["Round of 16", "p10", true], ["Semi-Finals", "Lukas Boxley", false], ["3rd Place", "Q", true]])
  const vince = top("Vince V", [["Round of 32", "p11", true], ["Round of 16", "p12", false], ["Semi-Finals", "Z", true], ["Finals", "Lukas Boxley", false]])
  const all = [munn, kunes, ruble, boxley, causey, vince]
  const f = field(...all.map(([n, l]) => [n, l] as [string, OtherTournamentBout[]]))

  it("finds one top bracket per weight: the group that won its pre-rounds", () => {
    const verdict = analyzeBrackets(TIERED, f).get("jm-2026|jmmain.csv|152")
    expect(verdict?.kind).toBe("tiered")
    expect([...(verdict as { top: ReadonlySet<string> }).top].sort()).toEqual(["aiden kunes", "chance ruble", "ryan munn"])
  })

  it("places the top bracket and gives a lower-tier bracket's finish no place", () => {
    const reports = buildEventReport({
      event: TIERED,
      athletes: all.map(([n, l], i) => athlete(`a${i}`, n, l)),
      field: f,
      index: NO_INDEX,
      lossesVisible: true,
    })
    const by = Object.fromEntries(reports.map((r) => [r.name, r]))
    expect(by["Ryan Munn"]!.placement).toBe("Champion")
    expect(by["Ryan Munn"]!.summary).toBe("He went 4-0 at 152 and won the title.")
    expect(by["Aiden Kunes"]!.place).toBe(2)
    expect(by["Chance Ruble"]!.place).toBe(3)
    expect(by["Lukas Boxley"]!.place).toBeNull()
    expect(by["Lukas Boxley"]!.placementNote).toMatch(/^Champion in a lower-tier bracket/)
    expect(reports.slice(0, 3).map((r) => r.name)).toEqual(["Ryan Munn", "Aiden Kunes", "Chance Ruble"])
  })

  it("states no place where two brackets tie for the top", () => {
    const other = (name: string, list: B[]) => [name, bouts("jm-2026", "jmmain.csv", "152", list, "2026-10-03")] as const
    const a = other("Logan Bailey", [["Round of 32", "x1", true], ["Finals", "Second", true]])
    const b = other("Second", [["Round of 32", "x2", true], ["Finals", "Logan Bailey", false]])
    const c = other("Arav Pandey", [["Round of 32", "x3", true], ["Finals", "Fourth", true]])
    const d = other("Fourth", [["Round of 32", "x4", true], ["Finals", "Arav Pandey", false]])
    const list = [a, b, c, d]
    const reports = buildEventReport({
      event: TIERED,
      athletes: list.map(([n, l], i) => athlete(`t${i}`, n, l)),
      field: field(...list.map(([n, l]) => [n, l] as [string, OtherTournamentBout[]])),
      index: NO_INDEX,
      lossesVisible: true,
    })
    expect(reports.every((r) => r.place == null)).toBe(true)
    expect(reports[0]!.placementNote).toMatch(/top brackets/)
  })

  it("counts an overflow bracket's bouts but not its place", () => {
    const of = bouts("jm-2026-of", "jm-of.csv", "170", [["Semi-Finals", "Flavio O", false], ["3rd Place", "Cody C", false]], "2026-10-02")
    const [r] = buildEventReport({ event: TIERED, athletes: [athlete("o", "Campbell T", of)], field: field(["Campbell T", of]), index: NO_INDEX, lossesVisible: true })
    expect(r).toMatchObject({ competed: true, place: null, record: { wins: 0, losses: 2 } })
    expect(r!.placementNote).toMatch(/4th in the Overflow bracket/)
    expect(r!.bouts[0]!.bracket).toBe("Overflow")
  })
})

describe("significant wins and notable losses", () => {
  const index: OpponentIndex = {
    tocField: [],
    ranked: [],
    statePlacers: [
      { name: "Champ Person", schools: ["Topsail"], finishes: [{ year: 2026, place: 1, classification: "4A" }] },
      { name: "Placer Person", schools: ["Hoggard"], finishes: [{ year: 2026, place: 3, classification: "4A" }] },
    ],
    stateSchools: ["Topsail", "Hoggard"],
  }
  const list = bouts("super32-2025", "main.csv", "150", [
    ["Round of 32", "Champ Person", true, { opponentClub: "Topsail" }],
    ["Round of 16", "Nobody Known", true],
    ["Quarter-Finals", "Placer Person", false, { opponentClub: "Hoggard" }],
  ])

  it("lists only computed credentials, with the profile's own labels", () => {
    const [r] = buildEventReport({ event: SINGLE, athletes: [athlete("s", "Sig W", list)], field: [], index, lossesVisible: true })
    expect(r!.significantWins).toEqual([
      expect.objectContaining({ opponent: "Champ Person", credential: "2026 NCHSAA 4A State Champion" }),
    ])
    expect(r!.notableLosses).toEqual([expect.objectContaining({ opponent: "Placer Person", credential: "2026 NCHSAA 4A State 3rd" })])
  })

  it("withholds notable losses from anyone the profile withholds them from", () => {
    const [r] = buildEventReport({ event: SINGLE, athletes: [athlete("s", "Sig W", list)], field: [], index, lossesVisible: false })
    expect(r!.notableLosses).toEqual([])
    expect(r!.significantWins).toHaveLength(1)
  })
})

describe("pronouns", () => {
  it("uses the surname, never they, when no gender is on file", () => {
    const list = bouts("super32-2025", "main.csv", "150", [["Round of 32", "A", true]])
    const [r] = buildEventReport({ event: SINGLE, athletes: [athlete("n", "Sam Q Doe", list, { gender: null })], field: [], index: NO_INDEX, lossesVisible: true })
    expect(r!.summary).toBe("Doe went 1-0 at 150.")
  })
})

describe("renderCoachEventReportEmail", () => {
  it("links every wrestler's profile and says who did not compete", () => {
    const list = bouts("super32-2025", "main.csv", "150", [["3rd Place", "A <b>", true]])
    const reports = buildEventReport({
      event: SINGLE,
      athletes: [athlete("id-1", "Pat Placer", list), athlete("id-2", "Zed Absent", [])],
      field: [],
      index: NO_INDEX,
      lossesVisible: true,
    })
    const { subject, bodyHtml } = renderCoachEventReportEmail({ event: SINGLE, coachName: "Eric Biehl", reports })
    expect(subject).toBe("2025 Super 32: your 2 starred wrestlers")
    expect(bodyHtml).toContain("https://app.ncwrestlingunited.com/athletes/id-1")
    expect(bodyHtml).toContain("https://app.ncwrestlingunited.com/athletes/id-2")
    expect(bodyHtml).toContain("Did not compete at 2025 Super 32.")
    expect(bodyHtml).toContain("Coach Biehl,")
    expect(bodyHtml).not.toContain("<b>")
    expect(bodyHtml.indexOf("Pat Placer")).toBeLessThan(bodyHtml.indexOf("Zed Absent"))
  })
})

describe("roundRank", () => {
  it("lists the pools, the championship side, the consolations, then the placement matches", () => {
    const rounds = ["3rd Place", "Consi-Semis", "Consi of 4", "Consi of 8 #2", "Consi of 8 #1", "Round of 16", "Round of 32", "Round of 128", "RR Rnd 2", "RR Rnd 1", "Finals", "Semi-Finals", "Quarter-Finals"]
    expect([...rounds].sort((a, b) => roundRank(a) - roundRank(b))).toEqual([
      "RR Rnd 1", "RR Rnd 2", "Round of 128", "Round of 32", "Round of 16", "Quarter-Finals", "Semi-Finals",
      "Consi of 8 #1", "Consi of 8 #2", "Consi of 4", "Consi-Semis", "3rd Place", "Finals",
    ])
  })
})
