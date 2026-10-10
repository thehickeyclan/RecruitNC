import { describe, expect, it } from "vitest"
import {
  buildBestWinsSection,
  buildComparisonRows,
  buildFreestyleSection,
  buildNationalSection,
  type ComparisonReport,
  type ComparisonRow,
} from "./athlete-comparison-rows"
import { placeNumber, type ScoutingReportResultRow } from "./scouting-report"

function report(over: {
  name: string
  grad?: number
  results?: ScoutingReportResultRow[]
  rankedWins?: { national: number; tocField: number; stateRanked: number; total: number }
  gpa?: string | null
  sat?: string | null
  rank?: number | null
  nationalEvents?: string[]
  wins?: Array<{ reason: string; date: string }>
}): ComparisonReport {
  return {
    athleteId: over.name,
    generatedAt: "",
    identity: {
      name: over.name, photoUrl: null, highSchool: null, highSchoolLogoUrl: null, club: null, clubLogoUrl: null,
      graduationYear: over.grad ?? 2027, weightClass: "150", lastCompetedWeight: null, lastCompetedEvent: null,
      lastCompetedYear: null, lastCompetedDate: null, collegeWeightClass: null, gender: "male", state: "NC", city: null,
    },
    contact: { cell: null, email: null, highlightVideoUrl: null, floProfileUrl: null, trackWrestlingProfileUrl: null, instagramUrl: null },
    academics: { gpa: over.gpa ?? null, sat: over.sat ?? null, act: null, academicInterest: null, academicSummary: null },
    membership: { ncUnitedTeam: null, isBlue: false },
    careerRecord: null,
    competition: { scope: over.nationalEvents?.length ? "national" : "in-state", nationalEvents: over.nationalEvents ?? [], styles: ["folkstyle"] },
    results: over.results ?? [],
    significantWins: (over.wins ?? []).map((w, i) => ({ opponent: `Opp ${i}`, opponentSchool: null, event: "Event", result: "Dec 3-1", weight: 150, ...w })),
    significantLosses: [],
    reportedWins: [],
    seasonStrength: null,
    seasonStrengthSeason: null,
    strengthOfCompetition: {
      rankedWins: over.rankedWins ?? { national: 0, tocField: 0, stateRanked: 0, total: 0 },
      credentialedLosses: 0,
      season: null,
      seasonLabel: null,
      nationalEvents: over.nationalEvents ?? [],
      teamEvents: [],
      offSeasonEvents: 0,
      recordsBeginYear: null,
      seasonsOnFile: 1,
      grade: { score: 0, band: "red", label: "", verdict: "", factors: [], nextStep: null },
    },
    recruitingStatus: null,
    commitment: null,
    prospectRanking: over.rank ?? null,
    rankingPublished: over.rank != null,
    nationalRankings: [],
    starRating: null,
    accessTier: "full",
    watermark: null,
  } as unknown as ComparisonReport
}

const state = (year: number, place: number | null, cls = "4A"): ScoutingReportResultRow => ({
  event: "NCHSAA State Championships", year, date: null, weight: "150", place, record: null,
  detail: `${cls} · 150 · ${place ? place : "Qualifier"}`,
})
const nhsca = (year: number, place: number | null, record: string): ScoutingReportResultRow => ({
  event: "NHSCA Nationals", year, date: null, weight: "150", place, record, detail: "",
})
const row = (rows: ComparisonRow[], key: string) => rows.find((r) => r.key === key)!
const NOW = new Date("2026-10-09T12:00:00Z")
const wins = (n: number, reason: string, date: string) => Array.from({ length: n }, () => ({ reason, date }))

describe("placeNumber", () => {
  it("reads the national tables' display text", () => {
    expect(placeNumber("Champion")).toBe(1)
    expect(placeNumber("3rd All-American")).toBe(3)
    expect(placeNumber("7th Place")).toBe(7)
    expect(placeNumber("did not place")).toBeNull()
    expect(placeNumber("")).toBeNull()
  })
})

describe("comparison rows", () => {
  it("gives the state edge to the better best finish and names the classifications", () => {
    const rows = buildComparisonRows(
      report({ name: "Al Left", results: [state(2026, 2, "4A")] }),
      report({ name: "Bo Right", results: [state(2026, 1, "1A")] }),
      { personal: true },
    )
    expect(row(rows, "state").edge).toBe("right")
    expect(row(rows, "state").basis).toContain("different classifications")
  })

  it("puts a state placer ahead of a qualifier who did not place", () => {
    const rows = buildComparisonRows(
      report({ name: "Al Left", results: [state(2026, null)] }),
      report({ name: "Bo Right", results: [state(2026, 6)] }),
      { personal: true },
    )
    expect(row(rows, "state").edge).toBe("right")
  })

  it("leads strength of opponents with nationally ranked wins", () => {
    const rows = buildComparisonRows(
      report({ name: "Al Left", wins: [...wins(2, "national-ranked", "2026-03-28"), ...wins(1, "ranked", "2026-01-10")] }),
      report({ name: "Bo Right", wins: [...wins(2, "toc-field", "2026-09-18"), ...wins(6, "ranked", "2026-02-01")] }),
      { personal: true, now: NOW },
    )
    expect(row(rows, "strength").edge).toBe("left")
  })

  it("counts ranked wins over the last 12 months, not a career", () => {
    // The senior has more career wins; the sophomore has more this year.
    const senior = report({ name: "Jay Senior", grad: 2027, wins: [...wins(30, "ranked", "12/15/2024"), ...wins(5, "ranked", "1/20/2026")] })
    const soph = report({ name: "Al Soph", grad: 2029, wins: wins(9, "ranked", "11/22/2025") })
    const strength = row(buildComparisonRows(soph, senior, { personal: true, now: NOW }), "strength")
    expect(strength.edge).toBe("left")
    expect(strength.basis).toBe("More wins over ranked opponents in the last 12 months (9 to 5)")
    expect(strength.right.lines?.[0]).toBe("Career: 0 ranked wins")
  })

  it("compares the latest state tournament, not each wrestler's best ever", () => {
    const rows = buildComparisonRows(
      report({ name: "Al Left", results: [state(2024, 1), state(2026, 4)] }),
      report({ name: "Bo Right", results: [state(2026, 2)] }),
      { personal: true, now: NOW },
    )
    expect(row(rows, "state").edge).toBe("right")
    expect(row(rows, "state").basis).toBe("2026 state tournament: 2nd against 4th")
  })

  it("counts national events entered in the last 12 months", () => {
    const rows = buildComparisonRows(
      report({ name: "Al Left", results: [nhsca(2026, null, "3-2")] }),
      report({ name: "Bo Right", results: [nhsca(2024, null, "2-2"), nhsca(2025, null, "1-2")] }),
      { personal: true, now: NOW },
    )
    expect(row(rows, "footprint").edge).toBe("left")
  })

  it("says which wrestler is younger when the classes differ", () => {
    const rows = buildComparisonRows(report({ name: "Al Soph", grad: 2029 }), report({ name: "Jay Senior", grad: 2027 }), { personal: true, now: NOW })
    expect(row(rows, "class").basis).toMatch(/^Soph is two years younger\./)
    const same = buildComparisonRows(report({ name: "A B", grad: 2027 }), report({ name: "C D", grad: 2027 }), { personal: true })
    expect(row(same, "class").basis).toBeNull()
  })

  it("offers a tournament row only when somebody entered, and gives no edge for not entering", () => {
    const rows = buildComparisonRows(
      report({ name: "Al Left", results: [nhsca(2026, 5, "5-2")] }),
      report({ name: "Bo Right" }),
      { personal: true },
    )
    expect(row(rows, "nhsca").edge).toBeNull()
    expect(row(rows, "nhsca").right.value).toBe("Did not enter")
    expect(row(rows, "nhsca").left.value).toContain("5-2 overall")
    expect(rows.find((r) => r.key === "fargo")).toBeUndefined()
  })

  it("tournament rows start switched off", () => {
    const rows = buildComparisonRows(
      report({ name: "Al Left", results: [nhsca(2026, 5, "5-2")] }),
      report({ name: "Bo Right", results: [nhsca(2026, null, "3-2")] }),
      { personal: true },
    )
    expect(row(rows, "nhsca").defaultOn).toBe(false)
    expect(row(rows, "nhsca").edge).toBe("left")
    expect(row(rows, "strength").defaultOn).toBe(true)
  })

  it("compares GPA for a verified coach and hides it from everyone else", () => {
    const l = report({ name: "Al Left", gpa: "3.9" })
    const r = report({ name: "Bo Right", gpa: "3.4" })
    expect(row(buildComparisonRows(l, r, { personal: true }), "gpa").edge).toBe("left")
    const hidden = row(buildComparisonRows(l, r, { personal: false }), "gpa")
    expect(hidden.edge).toBeNull()
    expect(hidden.left.value).toBe("Verified college coaches only")
  })

  it("does not compare ranks from two different class boards", () => {
    const rows = buildComparisonRows(
      report({ name: "Al Left", grad: 2027, rank: 3 }),
      report({ name: "Bo Right", grad: 2028, rank: 1 }),
      { personal: true },
    )
    expect(row(rows, "state-rank").edge).toBeNull()
  })

  it("says nothing is on file rather than leaving a cell blank", () => {
    const rows = buildComparisonRows(report({ name: "Al Left" }), report({ name: "Bo Right" }), { personal: true })
    for (const r of rows) {
      expect(r.left.value.trim()).not.toBe("")
      expect(r.right.value.trim()).not.toBe("")
    }
  })
})

const journeymen = (year: number, place: number | null, record: string, overflow = false): ScoutingReportResultRow => ({
  event: overflow ? "Journeymen Fall Classic (OF)" : "Journeymen Fall Classic", year, date: `${year}-10-04`, weight: "150", place, record,
  detail: `150 · ${place ?? "did not place"} · ${record} record`, style: "folkstyle",
})
const fargo = (year: number, place: number | null, record: string, style: "freestyle" | "greco" = "freestyle"): ScoutingReportResultRow => ({
  event: "Fargo", year, date: null, weight: "150", place, record, style,
  detail: `16U ${style === "greco" ? "Greco-Roman" : "Freestyle"} · 150 · ${place ? `${place}th` : "did not place"} · ${record} record`,
})

describe("national tournament edges", () => {
  it("compares best trips, so an extra younger trip never counts against a wrestler", () => {
    const rows = buildComparisonRows(
      report({ name: "Luke Richards", results: [nhsca(2026, null, "4-2"), nhsca(2025, null, "1-2")] }),
      report({ name: "Daniel McDermott", results: [nhsca(2026, null, "4-2")] }),
      { personal: true },
    )
    expect(row(rows, "nhsca").edge).toBeNull()
    expect(row(rows, "nhsca").basis).toBe("Neither placed; best trip 4-2 each")
  })

  it("still gives the edge to the better best trip, with the numbers", () => {
    const rows = buildComparisonRows(
      report({ name: "Luke Richards", results: [nhsca(2026, null, "5-2")] }),
      report({ name: "Daniel McDermott", results: [nhsca(2026, null, "4-2")] }),
      { personal: true },
    )
    expect(row(rows, "nhsca").edge).toBe("left")
    expect(row(rows, "nhsca").basis).toBe("Neither placed; best trip 5-2 against 4-2")
  })
})

describe("national tournaments section", () => {
  it("lines the three events up and counts placings and records", () => {
    const s = buildNationalSection(
      report({ name: "Al Left", results: [nhsca(2026, 5, "5-2"), journeymen(2026, 3, "4-1")] }),
      report({ name: "Bo Right", results: [nhsca(2026, null, "3-2")] }),
    )
    expect(s.blocks.map((b) => b.key)).toEqual(["nhsca", "super32", "journeymen"])
    expect(s.left).toMatchObject({ events: 2, placings: 2, record: "9-3" })
    expect(s.right).toMatchObject({ events: 1, placings: 0, record: "3-2" })
    expect(s.summary).toContain("Left has more national placings (2 to 0)")
  })

  it("never counts an overflow bracket's place", () => {
    const s = buildNationalSection(report({ name: "Al Left", results: [journeymen(2026, 1, "5-0", true)] }), report({ name: "Bo Right" }))
    const line = s.blocks.find((b) => b.key === "journeymen")!.left[0]!
    expect(line.finish).toBe("Overflow bracket")
    expect(s.left.placings).toBe(0)
    expect(s.left.record).toBe("5-0")
  })

  it("says so when neither has been", () => {
    expect(buildNationalSection(report({ name: "Al Left" }), report({ name: "Bo Right" })).summary).toBe(
      "Neither has a result at NHSCA, Super 32 or Journeymen on file.",
    )
  })
})

describe("freestyle section", () => {
  it("shows who wrestles the Olympic styles, with every result as evidence", () => {
    const s = buildFreestyleSection(
      report({ name: "Al Left", results: [fargo(2026, 6, "6-2"), fargo(2026, null, "1-2", "greco"), nhsca(2026, 5, "5-2")] }),
      report({ name: "Bo Right", results: [nhsca(2026, null, "3-2")] }),
    )
    expect(s.left.freestyle).toHaveLength(1)
    expect(s.left.greco).toHaveLength(1)
    expect(s.left.freestyle[0]!.division).toBe("16U Freestyle")
    expect(s.right.freestyle).toHaveLength(0)
    expect(s.summary).toContain("Only Left has freestyle or Greco results on file")
    expect(s.summary).toContain("Nothing on file for Right")
  })

  it("does not call a dual meet a missed placing", () => {
    const duals: ScoutingReportResultRow = {
      event: "16U National Duals", year: 2026, date: null, weight: "126", place: null, record: "6-1", style: "greco",
      detail: "16U Boys Greco-Roman · 126 · did not place · 6-1 record",
    }
    expect(buildFreestyleSection(report({ name: "Al Left", results: [duals] }), report({ name: "Bo Right" })).left.greco[0]!.finish).toBe("Duals")
  })
})

describe("best wins section", () => {
  it("agrees with the strength-of-opponents row", () => {
    const l = report({ name: "Al Left", wins: [...wins(2, "national-ranked", "2026-03-28"), ...wins(1, "ranked", "2026-01-10")] })
    const r = report({ name: "Bo Right", wins: [...wins(2, "toc-field", "2026-09-18"), ...wins(6, "ranked", "2026-02-01")] })
    const s = buildBestWinsSection(l, r, 6, NOW)
    expect(s.edge).toBe(row(buildComparisonRows(l, r, { personal: true, now: NOW }), "strength").edge)
    expect(s.summary).toMatch(/^Left has the better wins: more wins over nationally ranked opponents in the last 12 months \(2 to 0\)\.$/)
  })
})
