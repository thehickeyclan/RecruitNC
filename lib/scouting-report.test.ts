import { describe, expect, it } from "vitest"
import { mapAcademics, mapCareerRecord, mapContact, summaryFacts } from "@/lib/scouting-report"

/**
 * A row shaped like `athletes` actually is.
 *
 * These exact column names are the point of the file. The report first shipped reading
 * `gpa`, `sat`, `act`, `contact_email` and `career_record` — none of which are columns on
 * `athletes` — so every section rendered blank without anything erroring. 119 athletes had a
 * GPA the whole time. A typo here is silent in production and loud here.
 */
const ATHLETE_ROW = {
  academic_gpa: 3.8,
  academic_sat: 1280,
  academic_act: 27,
  academic_interest: "Pre-Med",
  academic_summary: "Honors track, dual enrollment.",
  phone: "(704) 794-5287",
  contactEmail: "athlete@example.com",
  careerRecord: "112-14",
  highlight_video_url: "https://example.com/film",
}

describe("mapAcademics", () => {
  it("reads the academic_* columns, not bare gpa/sat/act", () => {
    expect(mapAcademics(ATHLETE_ROW, true)).toMatchObject({
      gpa: "3.8",
      sat: "1280",
      act: "27",
      academicInterest: "Pre-Med",
    })
  })

  it("does not read the submissions-table spellings", () => {
    // `gpa`/`sat`/`act` live on athlete_profile_submissions and must never be the source.
    expect(mapAcademics({ gpa: 4.0, sat: 1500, act: 35 }, true)).toMatchObject({
      gpa: null,
      sat: null,
      act: null,
    })
  })

  it("withholds records on the intelligence tier but keeps the intended major", () => {
    const withheld = mapAcademics(ATHLETE_ROW, false)
    expect(withheld.gpa).toBeNull()
    expect(withheld.sat).toBeNull()
    expect(withheld.act).toBeNull()
    expect(withheld.academicSummary).toBeNull()
    // A major is what a wrestler publishes to be recruited; it is not a private record.
    expect(withheld.academicInterest).toBe("Pre-Med")
  })
})

describe("mapContact", () => {
  it("reads phone and contactEmail as the table spells them", () => {
    expect(mapContact(ATHLETE_ROW, true)).toMatchObject({
      cell: "(704) 794-5287",
      email: "athlete@example.com",
    })
  })

  it("withholds cell and email on the intelligence tier", () => {
    const withheld = mapContact(ATHLETE_ROW, false)
    expect(withheld.cell).toBeNull()
    expect(withheld.email).toBeNull()
  })

  it("keeps film on both tiers — the athlete publishes it themselves", () => {
    expect(mapContact(ATHLETE_ROW, false).highlightVideoUrl).toBe("https://example.com/film")
  })
})

describe("mapCareerRecord", () => {
  it("reads the camelCase column", () => {
    expect(mapCareerRecord(ATHLETE_ROW)).toBe("112-14")
  })

  it("is null when absent rather than rendering an empty string", () => {
    expect(mapCareerRecord({})).toBeNull()
    expect(mapCareerRecord({ careerRecord: "  " })).toBeNull()
  })
})

/**
 * The standings must stay apart in the model's facts.
 *
 * The report carries three reasons a bout is significant — a national ranking, the TOC field,
 * and an NC prospect ranking — but the summary facts used to introduce all three under one
 * "ranked" heading with no per-bout label. A model given that is free to call a state-ranked
 * opponent "ranked", which a coach reads as nationally ranked. It oversells the modest athlete
 * and undersells the strong one, and neither is recoverable from the sentence.
 */
const REPORT_BASE = {
  athleteId: "a1",
  generatedAt: "2026-09-07T00:00:00.000Z",
  identity: {
    name: "Test Wrestler",
    photoUrl: null,
    highSchool: null,
    highSchoolLogoUrl: null,
    club: null,
    clubLogoUrl: null,
    graduationYear: 2027,
    weightClass: "132",
    lastCompetedWeight: null,
    lastCompetedEvent: null,
    lastCompetedYear: null,
    lastCompetedDate: null,
    gender: null,
    state: "NC",
    city: null,
  },
  contact: { cell: null, email: null, highlightVideoUrl: null },
  academics: { gpa: null, sat: null, act: null, academicInterest: null, academicSummary: null },
  membership: { ncUnitedTeam: null, isBlue: false },
  careerRecord: null,
  results: [],
  significantWins: [],
  significantLosses: [],
  recruitingStatus: null,
  commitment: null,
  prospectRanking: null,
  rankingPublished: false,
  nationalRankings: [],
  accessTier: "full" as const,
  watermark: null,
}

const bout = (over: Record<string, unknown> = {}) => ({
  opponent: "Rival Wrestler",
  opponentSchool: null,
  event: "Super 32 Early Entry",
  date: "2026-09-14",
  result: "3-1",
  weight: 132,
  reason: "ranked" as const,
  opponentGraduationYear: null,
  ...over,
})

describe("summaryFacts standings", () => {
  it("says nationally ranked, and names the outlet", () => {
    const facts = summaryFacts({
      ...REPORT_BASE,
      significantWins: [
        bout({ reason: "national-ranked", nationalRankLabel: "#12 Sports Illustrated" }),
      ],
    } as never)
    expect(facts).toContain("nationally ranked, #12 Sports Illustrated")
  })

  it("says ranked in North Carolina for a state ranking, never bare 'ranked'", () => {
    const facts = summaryFacts({ ...REPORT_BASE, significantWins: [bout()] } as never)
    // Asserted on the bout line: the section heading names all three standings by design.
    const line = facts.split("\n").find((l) => l.startsWith("- beat"))!
    expect(line).toContain("(ranked in North Carolina)")
    expect(line).not.toContain("nationally ranked")
  })

  it("names the TOC field as its own standing", () => {
    const facts = summaryFacts({
      ...REPORT_BASE,
      significantLosses: [bout({ reason: "toc-field" })],
    } as never)
    expect(facts).toContain("in the Tournament of Champions field")
  })

  it("labels every bout, so a mixed list cannot be read as one standing", () => {
    const facts = summaryFacts({
      ...REPORT_BASE,
      significantWins: [
        bout({ opponent: "A", reason: "national-ranked", nationalRankLabel: "#8 FloWrestling" }),
        bout({ opponent: "B", reason: "ranked" }),
      ],
    } as never)
    expect(facts).toContain("A (nationally ranked, #8 FloWrestling)")
    expect(facts).toContain("B (ranked in North Carolina)")
  })
})

describe("summaryFacts last competed", () => {
  it("carries the event and the exact day when one is on file", () => {
    const facts = summaryFacts({
      ...REPORT_BASE,
      identity: {
        ...REPORT_BASE.identity,
        lastCompetedWeight: "132",
        lastCompetedEvent: "Super 32 Early Entry (VA)",
        lastCompetedYear: 2026,
        lastCompetedDate: "2026-09-14",
      },
    } as never)
    expect(facts).toContain("Last competed at: 132 — Super 32 Early Entry (VA) (2026-09-14)")
  })

  it("falls back to the year rather than inventing a day", () => {
    // NCHSAA, NHSCA, Fargo and Super 32 rows record a year and nothing finer.
    const facts = summaryFacts({
      ...REPORT_BASE,
      identity: {
        ...REPORT_BASE.identity,
        lastCompetedWeight: "138",
        lastCompetedEvent: "NCHSAA States",
        lastCompetedYear: 2026,
        lastCompetedDate: null,
      },
    } as never)
    expect(facts).toContain("Last competed at: 138 — NCHSAA States (2026)")
  })
})

describe("summaryFacts national rankings", () => {
  it("gives the model the run of months and the movement", () => {
    const facts = summaryFacts({
      ...REPORT_BASE,
      nationalRankings: [
        {
          source: "sports_illustrated",
          sourceLabel: "Sports Illustrated",
          current: 12,
          movement: 18,
          editions: [
            { rankingMonth: "2026-09-01", rank: 12 },
            { rankingMonth: "2026-07-01", rank: 30 },
          ],
        },
      ],
    } as never)
    expect(facts).toContain("Sports Illustrated: #12 in 2026-09, #30 in 2026-07 — up 18 places")
  })

  it("says nothing at all when the athlete is unranked", () => {
    expect(summaryFacts(REPORT_BASE as never)).not.toContain("National rankings")
  })
})
