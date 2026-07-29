import { describe, expect, it } from "vitest"
import {
  buildAnalystClosingSentence,
  buildAnalystLeadParagraph,
  buildCareerSnapshotMarkdown,
  buildDevelopmentPathMarkdown,
  buildHistoricalContextNarrative,
  buildHistoricalRankingsMarkdown,
  buildNationalResumeMarkdown,
  buildNotableAchievementsMarkdown,
  athleteHasCompletedHighSchoolCareer,
  explicitlyMentionsBloodRound,
  buildVerifiedSourcesFooter,
  formatStateResultsSection,
} from "./data-dawg-athlete-analyst-profile"

const sly = {
  displayName: "Bentley Sly",
  highSchool: "Stuart Cramer",
  graduationYear: 2026,
  careerWins: 207,
  careerLosses: 6,
  stateTitleYears: 4,
  college: "Appalachian State",
  division: "D1",
  careerWinsRank: 18,
  nhscaAllAmericanCount: 3,
  super32AllAmericanCount: 1,
  fargoAllAmericanCount: 0,
  prospectRanking: 1,
  schoolDualTitles: [{ year: 2024, division: "3A" }],
  nchsaaPlacesChronological: [
    { year: 2023, place: 1 },
    { year: 2024, place: 1 },
    { year: 2025, place: 1 },
    { year: 2026, place: 1 },
  ],
  seasonRecords: [
    { classLabel: "Junior", year: 2025, wins: 55, losses: 0 },
    { classLabel: "Senior", year: 2026, wins: 48, losses: 0 },
  ],
}

const liam = {
  displayName: "Liam Hickey",
  highSchool: "Cardinal Gibbons",
  graduationYear: 2025,
  careerWins: 179,
  careerLosses: 6,
  stateTitleYears: 2,
  college: "NC State",
  previousCollege: "UNC Chapel Hill",
  nhscaAllAmericanCount: 2,
  daveSchultzYears: [2025],
  schoolDualTitles: [{ year: 2025, division: "4A" }],
  wrestlingClub: "Team Excel",
  ncUnitedBlue: true,
  ncUnitedEvents: [
    { year: 2024, event: "Ultimate Club Duals", record: "6-1" },
    { year: 2025, event: "NHSCA Duals", record: "5-1" },
  ],
  nchsaaPlacesChronological: [
    { year: 2022, place: 3 },
    { year: 2023, place: 3 },
    { year: 2024, place: 1 },
    { year: 2025, place: 1 },
  ],
  seasonRecords: [{ classLabel: "Senior", year: 2025, wins: 36, losses: 0 }],
  prospectRanking: 2,
}

describe("buildAnalystLeadParagraph", () => {
  const asOf = new Date(2026, 6, 15) // Jul 15, 2026 — Class of 2026 done; 2027 still in HS

  it("opens with compact fact stack for a four-timer (alumni tense)", () => {
    const lead = buildAnalystLeadParagraph(sly, asOf)
    expect(lead).toContain("finished his Stuart Cramer career as")
    expect(lead).toContain("four-time NCHSAA champion")
    expect(lead).toContain("three-time NHSCA All-American")
    expect(lead).toContain("Super 32 All-American")
    expect(lead).not.toContain("RecruitNC's No. 1 prospect in the Class of 2026")
    expect(lead).toMatch(/207.6/)
    expect(lead).toContain("committed to Appalachian State")
    expect(lead).not.toMatch(/back-to-back/i)
    expect(lead).not.toMatch(/established himself as one of the top/i)
  })

  it("uses present tense for Class of 2027 (not yet graduated)", () => {
    const lead = buildAnalystLeadParagraph(
      {
        displayName: "Tobin McNair",
        highSchool: "Wakefield",
        graduationYear: 2027,
        careerWins: 138,
        careerLosses: 2,
        stateTitleYears: 2,
        college: "Binghamton",
        nhscaAllAmericanCount: 2,
        prospectRanking: 2,
        nchsaaPlacesChronological: [
          { year: 2024, place: 3 },
          { year: 2025, place: 1 },
          { year: 2026, place: 1 },
        ],
      },
      asOf,
    )
    expect(lead).toContain("is a Wakefield wrestler who is")
    expect(lead).toContain("two-time NCHSAA champion")
    expect(lead).toContain("two-time NHSCA All-American")
    expect(lead).toContain("RecruitNC's No. 2 prospect in the Class of 2027")
    expect(lead).toMatch(/He is 138.2 at Wakefield and committed to Binghamton/)
    expect(lead).not.toMatch(/finished his/i)
    expect(lead).not.toMatch(/He went /)
  })

  it("does not publish RecruitNC prospect rank outside the official top 20", () => {
    const lead = buildAnalystLeadParagraph(
      {
        displayName: "Abdul-Jamil Zaggout",
        highSchool: "West Forsyth",
        graduationYear: 2027,
        careerWins: 30,
        careerLosses: 6,
        stateTitleYears: 1,
        prospectRanking: 58,
      },
      asOf,
    )

    expect(lead).toContain("West Forsyth wrestler")
    expect(lead).toContain("NCHSAA State Champion")
    expect(lead).not.toContain("No. 58")
    expect(lead).not.toMatch(/RecruitNC.*58/)
  })
})

describe("buildCareerSnapshotMarkdown", () => {
  it("keeps a compact non-duplicative snapshot", () => {
    const snap = buildCareerSnapshotMarkdown(sly)
    expect(snap).toContain("Career snapshot:")
    expect(snap).toMatch(/207.6/)
    expect(snap).toContain("Four consecutive NCHSAA state titles")
    expect(snap).toContain("3× NHSCA All-American")
    expect(snap).toContain("Super 32 All-American")
    expect(snap).toContain("Appalachian State")
    expect(snap).not.toContain("Stuart Cramer")
  })

  it("lists college career path for transfers", () => {
    const snap = buildCareerSnapshotMarkdown(liam)
    expect(snap).toContain("UNC Chapel Hill → NC State")
    expect(snap).toContain("Dave Schultz Award Winner")
    expect(snap).toContain("2× NHSCA All-American")
  })
})

describe("buildHistoricalContextNarrative", () => {
  it("states four consecutive titles without underselling as back-to-back", () => {
    const ctx = buildHistoricalContextNarrative(sly)
    expect(ctx).toContain("Historical context:")
    expect(ctx).toMatch(/four consecutive NCHSAA state championships from 2023 through 2026/i)
    expect(ctx).toMatch(/every season of his high school career/i)
    expect(ctx).toMatch(/one of 17 four-time/i)
    expect(ctx).toMatch(/chronologically/i)
    expect(ctx).not.toMatch(/back-to-back/i)
  })

  it("connects podium → titles for Liam", () => {
    const ctx = buildHistoricalContextNarrative(liam)
    expect(ctx).toMatch(/After two third-place finishes/i)
    expect(ctx).toMatch(/consecutive state championships/i)
    expect(ctx).toMatch(/36.0/)
    expect(ctx).toContain("Dave Schultz")
    expect(ctx).toContain("key role in Cardinal Gibbons' 2025")
  })
})

describe("buildNotableAchievementsMarkdown", () => {
  it("uses consecutive four-title wording instead of back-to-back", () => {
    const n = buildNotableAchievementsMarkdown(sly)
    expect(n).toContain("four consecutive")
    expect(n).toContain("2023 through 2026")
    expect(n).toContain("every season")
    expect(n).not.toMatch(/back-to-back/i)
    expect(n).toMatch(/207.6/)
    expect(n).toContain("NHSCA All-American")
    expect(n).toContain("Super 32")
  })
})

describe("buildDevelopmentPathMarkdown", () => {
  it("folds NC United Blue + national events into one section", () => {
    const d = buildDevelopmentPathMarkdown(liam)
    expect(d).toContain("Development path:")
    expect(d).toContain("Team Excel")
    expect(d).toContain("NC United")
    expect(d).toContain("🔵 Blue Team")
    expect(d).toContain("2 national-team events")
    expect(d).toContain("• Ultimate Club Duals")
    expect(d).toContain("UNC Chapel Hill → NC State")
  })
})

describe("buildHistoricalRankingsMarkdown", () => {
  it("only emits verified ranks and clear chronological 4× membership", () => {
    const r = buildHistoricalRankingsMarkdown(sly)
    expect(r).toContain("#18 in NC history")
    expect(r).not.toContain("RecruitNC #1")
    expect(r).toContain("One of 17")
    expect(r).toMatch(/chronologically/i)
    expect(r).not.toMatch(/15th of 17/)
    expect(r).not.toContain("Top 50 in NC history")
    expect(r).not.toContain("Career Win %")
  })

  it("does not list RecruitNC rankings past the published top 20", () => {
    const r = buildHistoricalRankingsMarkdown({
      displayName: "Abdul-Jamil Zaggout",
      highSchool: "West Forsyth",
      graduationYear: 2027,
      careerWins: 30,
      careerLosses: 6,
      stateTitleYears: 1,
      prospectRanking: 58,
    })

    expect(r).not.toContain("RecruitNC #58")
    expect(r).not.toContain("Class of 2027")
  })
})

describe("buildNationalResumeMarkdown", () => {
  it("summarizes AA count and best finish first", () => {
    const md = buildNationalResumeMarkdown({
      nhsca: [
        { year: 2024, placement: "8th", record: "", weight: "132" },
        { year: 2025, placement: "4th", record: "", weight: "138" },
      ],
      graduationYear: 2025,
    })
    expect(md).toContain("2× NHSCA All-American")
    expect(md).toContain("Best finish: 4th (2025)")
  })

  it("picks best Super32 record, not the first chronological row", () => {
    const md = buildNationalResumeMarkdown({
      super32: [
        { year: 2023, placement: "", record: "0-2", weight: "126" },
        { year: 2024, placement: "", record: "3-2", weight: "132" },
      ],
      graduationYear: 2025,
    })
    expect(md).toContain("Best listed result: 3–2")
    expect(md).not.toContain("Best listed result: 0–2")
  })

  it("does not infer Blood Round from a 6–2 Fargo record", () => {
    const md = buildNationalResumeMarkdown({
      fargo: [{ year: 2024, placement: "", record: "6-2", weight: "144", division: "16U" }],
      graduationYear: 2026,
    })
    expect(md).toContain("6–2")
    expect(md).not.toMatch(/Blood Round/i)
  })
})

describe("explicitlyMentionsBloodRound", () => {
  it("only matches explicit text", () => {
    expect(explicitlyMentionsBloodRound("Blood Round")).toBe(true)
    expect(explicitlyMentionsBloodRound("6-2")).toBe(false)
  })
})

describe("athleteHasCompletedHighSchoolCareer", () => {
  it("treats Class of 2027 as still in HS in July 2026", () => {
    const asOf = new Date(2026, 6, 15)
    expect(athleteHasCompletedHighSchoolCareer(2027, asOf)).toBe(false)
    expect(athleteHasCompletedHighSchoolCareer(2026, asOf)).toBe(true)
    expect(athleteHasCompletedHighSchoolCareer(2025, asOf)).toBe(true)
  })

  it("treats Class of 2026 as still active before June 2026", () => {
    expect(athleteHasCompletedHighSchoolCareer(2026, new Date(2026, 2, 1))).toBe(false)
  })
})

describe("buildVerifiedSourcesFooter", () => {
  it("lists verified sources and high confidence", () => {
    const f = buildVerifiedSourcesFooter(liam)
    expect(f).toContain("Verified sources:")
    expect(f).toContain("✓ NCHSAA")
    expect(f).toContain("✓ NHSCA")
    expect(f).toContain("✓ NC United")
    expect(f).toContain("Confidence: high")
  })
})

describe("formatStateResultsSection", () => {
  it("labels canonical non-podium rows as state qualifiers", () => {
    const md = formatStateResultsSection([
      { year: 2025, classification: "2A", weight_class: "144", place: null, school: "Wheatmore", wrestler_name: "Spencer Moore" },
      { year: 2026, classification: "3A", weight_class: "150", place: 0, school: "Wheatmore", wrestler_name: "Spencer Moore" },
    ])
    expect(md).toContain("2025: State qualifier (2A, 144lbs)")
    expect(md).toContain("2026: State qualifier (3A, 150lbs)")
  })
})

describe("buildAnalystClosingSentence", () => {
  it("still builds a coda for optional callers", () => {
    const close = buildAnalystClosingSentence(sly)
    expect(close).toContain("four-time")
    expect(close).toMatch(/207.6/)
    expect(close).toContain("Appalachian State")
  })
})

describe("buildAnalystLeadParagraph transfer", () => {
  it("narrates collegiate path UNC then NC State with fact stack", () => {
    const lead = buildAnalystLeadParagraph(liam, new Date(2026, 6, 15))
    expect(lead).toContain("finished his Cardinal Gibbons career as")
    expect(lead).toContain("two-time NCHSAA champion")
    expect(lead).toContain("Dave Schultz")
    expect(lead).toContain("two-time NHSCA All-American")
    expect(lead).toMatch(/179.6/)
    expect(lead).toContain("UNC Chapel Hill and NC State")
  })
})
