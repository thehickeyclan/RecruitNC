import { describe, expect, it } from "vitest"
import { buildResultRows, eventSortKey, isNationalEvent, seasonContext, stripSeasonFraming, weightProgression, mapAcademics, mapCareerRecord, mapContact, summaryFacts, unsupportedSummaryClaims,
  stripUnsupportedSentences,
} from "@/lib/scouting-report"

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

describe("unsupportedSummaryClaims", () => {
  const FACTS = [
    "Name: Carson Raper",
    "Class of 2029",
    "",
    "Tournament results:",
    "- 2026 NCHSAA States: 4A · 106 · Champion",
  ].join("\n")

  it("catches a ranking and a GPA the facts never mention", () => {
    // Exactly what the model wrote for a wrestler whose class is not ranked and who has no GPA
    // on file: two numbers with nothing behind them.
    const summary = "Raper is ranked RecruitNC #13 in the Class of 2029 and has a GPA of 3.8."
    expect(unsupportedSummaryClaims(summary, FACTS)).toEqual([
      "ranking #13",
      "GPA 3.8",
    ])
  })

  it("passes a summary whose numbers all come from the facts", () => {
    const facts = `${FACTS}\nGPA: 4.43\nRecruitNC ranking (North Carolina class ranking, not national): #13 in the Class of 2027`
    const summary = "Mayfield is RecruitNC #13 in the Class of 2027 and has a GPA of 4.43."
    expect(unsupportedSummaryClaims(summary, facts)).toEqual([])
  })

  it("says nothing about a summary that states no numbers", () => {
    expect(unsupportedSummaryClaims("Raper won the state title at 106.", FACTS)).toEqual([])
  })
})

describe("stripUnsupportedSentences", () => {
  // The TOC line is here because the summary below claims it. Before placements were checked,
  // this fixture asserted a 4th-place finish the facts never mentioned and nothing objected.
  const facts =
    "Name: Adam Walker\nClass of 2029\nTournament of Champions 2026 · 4th · 3-2 record\n" +
    "RecruitNC ranking: none published for this class. Do not state a ranking."

  it("keeps the true sentences and drops the invented one", () => {
    const summary =
      "Adam Walker is a Class of 2029 wrestler from Holly Springs. He placed 4th at the Tournament of Champions. " +
      "Walker is ranked RecruitNC #13 in the Class of 2029."
    const kept = stripUnsupportedSentences(summary, facts)
    expect(kept).toBe(
      "Adam Walker is a Class of 2029 wrestler from Holly Springs. He placed 4th at the Tournament of Champions.",
    )
  })

  it("gives up when too little would survive", () => {
    expect(stripUnsupportedSentences("Walker is RecruitNC #13. He has a GPA of 3.8.", facts)).toBeNull()
  })

  it("returns null when nothing needed removing, so the caller keeps the original", () => {
    expect(stripUnsupportedSentences("He placed 4th. He wrestles at Holly Springs.", facts)).toBeNull()
  })
})

describe("a placement the facts do not contain", () => {
  /*
   * Abdul-Jamil Zaggout, NHSCA 2026: 4-2 at 152, placed nowhere. The profile showed no
   * placement and Data Dawg knew it; the scouting report announced a 6th-place finish. The
   * facts line had simply omitted the placement, and the prompt told the model to give one.
   */
  const zaggoutFacts = [
    "Abdul-Jamil Zaggout, Class of 2027, West Forsyth.",
    "NHSCA Nationals 2026 · 152 · did not place · 4-2 record",
    "NCHSAA States 2026 · 8A · 132 · Champion",
    "RecruitNC ranking: #24 in the Class of 2027.",
    "GPA: 3.5",
  ].join("\n")

  it("states the absence instead of leaving a gap", () => {
    const rows = buildResultRows({
      nchsaa: [],
      nhsca: [{ year: 2026, placement: "", record: "4-2", weight: "152" }],
      super32: [],
      fargo: [],
      other: [],
    })
    expect(rows).toHaveLength(1)
    expect(rows[0].detail).toBe("152 · did not place · 4-2 record")
  })

  it("catches the invented 6th place", () => {
    const invented = "Zaggout placed 6th at the 2026 NHSCA Nationals at 152 pounds with a 4-2 record."
    expect(unsupportedSummaryClaims(invented, zaggoutFacts)).toContain("placement 6th")
  })

  it("leaves a placement the facts really contain alone", () => {
    const facts = "NHSCA Nationals 2026 · 152 · 6th All-American · 6-2 record"
    const truthful = "Zaggout finished 6th at NHSCA Nationals at 152."
    expect(unsupportedSummaryClaims(truthful, facts)).toEqual([])
  })

  it("does not flag the state title the facts do support", () => {
    const summary = "Zaggout was the 8A state champion at 132 pounds in 2026."
    expect(unsupportedSummaryClaims(summary, zaggoutFacts)).toEqual([])
  })

  it("catches an All-American claim over a record that has none", () => {
    const invented = "Zaggout is an All-American at 152."
    expect(unsupportedSummaryClaims(invented, zaggoutFacts)).toContain(
      "a all-american claim the facts do not contain",
    )
  })
})

describe("national coverage", () => {
  it("knows which events our records actually speak to", () => {
    expect(isNationalEvent("NHSCA Nationals")).toBe(true)
    expect(isNationalEvent("Super 32 Early Entry")).toBe(true)
    expect(isNationalEvent("Journeymen (OF)")).toBe(true)
    expect(isNationalEvent("I-64 Spring Duals")).toBe(true)
    expect(isNationalEvent("NCHSAA States")).toBe(false)
    expect(isNationalEvent("Tournament of Champions")).toBe(false)
  })

  it("does not claim Beast, Ironman or Powerade are covered", () => {
    // They are not ingested anywhere. Treating them as known events would let the report imply
    // a wrestler skipped them when we simply hold nothing either way.
    expect(isNationalEvent("Beast of the East")).toBe(false)
    expect(isNationalEvent("Ironman")).toBe(false)
    expect(isNationalEvent("Powerade")).toBe(false)
  })
})

describe("seasonContext", () => {
  const at = (iso: string) => seasonContext(new Date(`${iso}T12:00:00`))

  it("knows the season has not started in September", () => {
    // Adam Walker's report, written 23 Sept 2026, called his February 2026 state runner-up
    // finish "this season" — a season still two months from starting.
    const line = at("2026-09-23")
    expect(line).toContain("Today is September 23, 2026")
    expect(line).toContain("is not running")
    expect(line).toContain("2025-26 season closed at NCHSAA States in February 2026")
  })

  it("knows the season is running in December and January", () => {
    expect(at("2026-12-05")).toContain("2026-27 North Carolina high school season is under way")
    expect(at("2027-01-20")).toContain("2026-27 North Carolina high school season is under way")
  })

  it("treats late February as over, because States is mid-month", () => {
    expect(at("2027-02-10")).toContain("under way")
    expect(at("2027-02-25")).toContain("is not running")
  })
})

describe("stripSeasonFraming", () => {
  it("cuts the framing and keeps the fact", () => {
    expect(
      stripSeasonFraming("This season, Walker finished 2nd at the 2026 NCHSAA States at 113."),
    ).toBe("Walker finished 2nd at the 2026 NCHSAA States at 113.")
  })

  it("handles it mid-sentence", () => {
    expect(stripSeasonFraming("Walker finished 2nd this season at the 2026 NCHSAA States.")).toBe(
      "Walker finished 2nd at the 2026 NCHSAA States.",
    )
  })

  it("re-capitalises a sentence it opened", () => {
    expect(stripSeasonFraming("He placed 4th. Last season, he went 2-2.")).toBe(
      "He placed 4th. He went 2-2.",
    )
  })

  it("leaves a summary without season framing untouched", () => {
    const clean = "Walker placed 4th at the 2026 Tournament of Champions at 125."
    expect(stripSeasonFraming(clean)).toBe(clean)
  })
})

describe("weightProgression", () => {
  const row = (event: string, weight: string, date: string | null = null, year = 2026) => ({
    event,
    year,
    date,
    weight,
  })

  it("orders by the calendar, not by table order", () => {
    // The bug this exists for: a flat mid-year fallback for undated events put March's NHSCA
    // before February's States and reported Zaggout going 152 -> 132, "down 20 lbs", when he
    // had gone up 20.
    const line = weightProgression([
      row("NHSCA Nationals", "152"),
      row("NCHSAA States", "132"),
    ])
    expect(line).toBe(
      "132 (NCHSAA States 2026) → 152 (NHSCA Nationals 2026) — up 20 lbs across the period on file",
    )
  })

  it("puts a dated event in its real place", () => {
    const line = weightProgression([
      row("NCHSAA States", "113"),
      row("Tournament of Champions", "125", "2026-09-18"),
      row("NHSCA Nationals", "120"),
    ])
    expect(line).toContain("113 (NCHSAA States 2026) → 120 (NHSCA Nationals 2026) → 125")
    expect(line).toContain("up 12 lbs")
  })

  it("collapses a wrestler who never moved", () => {
    const line = weightProgression([row("NCHSAA States", "138"), row("NHSCA Nationals", "138")])
    expect(line).toBeNull()
  })

  it("says nothing on a single result", () => {
    expect(weightProgression([row("NCHSAA States", "138")])).toBeNull()
  })

  it("ignores results with no weight recorded", () => {
    expect(weightProgression([row("NCHSAA States", "138"), row("Fargo", "")])).toBeNull()
  })
})

describe("eventSortKey", () => {
  it("prefers a real date", () => {
    expect(eventSortKey("Tournament of Champions", 2026, "2026-09-18")).toBe("2026-09-18")
  })

  it("falls back to the month the event runs in", () => {
    expect(eventSortKey("NCHSAA States", 2026, null)).toBe("2026-02-01")
    expect(eventSortKey("NHSCA Nationals", 2026, null)).toBe("2026-03-01")
    expect(eventSortKey("Fargo", 2026, null)).toBe("2026-07-01")
    expect(eventSortKey("Super 32", 2026, null)).toBe("2026-10-01")
  })

  it("keeps an unknown event inside its own year", () => {
    expect(eventSortKey("Some New Open", 2026, null)).toBe("2026-12-31")
  })
})
