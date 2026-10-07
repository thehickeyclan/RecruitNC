import { describe, expect, it } from "vitest"
import { buildComparisonRows, type ComparisonReport, type ComparisonRow } from "./athlete-comparison-rows"
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
    significantWins: [],
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
  } as ComparisonReport
}

const state = (year: number, place: number | null, cls = "4A"): ScoutingReportResultRow => ({
  event: "NCHSAA State Championships", year, date: null, weight: "150", place, record: null,
  detail: `${cls} · 150 · ${place ? place : "Qualifier"}`,
})
const nhsca = (year: number, place: number | null, record: string): ScoutingReportResultRow => ({
  event: "NHSCA Nationals", year, date: null, weight: "150", place, record, detail: "",
})
const row = (rows: ComparisonRow[], key: string) => rows.find((r) => r.key === key)!

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
      report({ name: "Al Left", rankedWins: { national: 2, tocField: 0, stateRanked: 1, total: 3 } }),
      report({ name: "Bo Right", rankedWins: { national: 0, tocField: 2, stateRanked: 6, total: 8 } }),
      { personal: true },
    )
    expect(row(rows, "strength").edge).toBe("left")
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
