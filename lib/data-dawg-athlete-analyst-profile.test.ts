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
  buildVerifiedSourcesFooter,
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
  prospectRanking: 4,
  schoolDualTitles: [{ year: 2024, division: "3A" }],
  nchsaaPlacesChronological: [
    { year: 2023, place: 1 },
    { year: 2024, place: 1 },
    { year: 2025, place: 1 },
    { year: 2026, place: 1 },
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
  it("leads with significance and packs record + commit", () => {
    const lead = buildAnalystLeadParagraph(sly)
    expect(lead).toContain("most accomplished")
    expect(lead).toContain("Class of 2026")
    expect(lead).toContain("four-time NCHSAA State Champion at Stuart Cramer")
    expect(lead).toMatch(/207.6/)
    expect(lead).toContain("Appalachian State")
  })
})

describe("buildCareerSnapshotMarkdown", () => {
  it("puts career record near the top", () => {
    const snap = buildCareerSnapshotMarkdown(sly)
    expect(snap.split("\n")[1]).toMatch(/207.6/)
    expect(snap).toContain("4× NCHSAA State Champion")
    expect(snap).toContain("College: Appalachian State")
  })

  it("lists college career path for transfers", () => {
    const snap = buildCareerSnapshotMarkdown(liam)
    expect(snap).toContain("College career: UNC Chapel Hill → NC State")
  })
})

describe("buildHistoricalContextNarrative", () => {
  it("connects podium → titles → senior undefeated → duals → college for Liam", () => {
    const ctx = buildHistoricalContextNarrative(liam)
    expect(ctx).toContain("Historical context:")
    expect(ctx).toMatch(/freshman and sophomore/i)
    expect(ctx).toMatch(/back-to-back/i)
    expect(ctx).toMatch(/36.0/)
    expect(ctx).toContain("Dave Schultz")
    expect(ctx).toContain("Helped Cardinal Gibbons capture the 2025")
    expect(ctx).toContain("UNC Chapel Hill")
    expect(ctx).toContain("NC State")
  })
})

describe("buildNotableAchievementsMarkdown", () => {
  it("highlights memorable Liam facts", () => {
    const n = buildNotableAchievementsMarkdown(liam)
    expect(n).toContain("Back-to-back")
    expect(n).toContain("Dave Schultz")
    expect(n).toMatch(/only 6 career losses/i)
    expect(n).toContain("UNC Chapel Hill")
    expect(n).toContain("NC United Blue")
  })
})

describe("buildDevelopmentPathMarkdown", () => {
  it("shows high school, club, blue, national team, college path", () => {
    const d = buildDevelopmentPathMarkdown(liam)
    expect(d).toContain("Development path:")
    expect(d).toContain("Cardinal Gibbons")
    expect(d).toContain("Team Excel")
    expect(d).toContain("Blue Team")
    expect(d).toContain("National Team")
    expect(d).toContain("UNC Chapel Hill → NC State")
  })
})

describe("buildHistoricalRankingsMarkdown", () => {
  it("includes win percentage", () => {
    const r = buildHistoricalRankingsMarkdown(liam)
    expect(r).toContain("Career win %")
    expect(r).toContain("96.8%")
    expect(r).toContain("#2 RecruitNC")
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

describe("buildAnalystClosingSentence", () => {
  it("ends with a full career coda", () => {
    const close = buildAnalystClosingSentence(sly)
    expect(close).toContain("four-time")
    expect(close).toMatch(/207.6/)
    expect(close).toContain("Appalachian State")
    expect(close.endsWith(".")).toBe(true)
  })
})

describe("buildAnalystLeadParagraph transfer", () => {
  it("narrates collegiate path UNC then NC State", () => {
    const lead = buildAnalystLeadParagraph(liam)
    expect(lead).toContain("continued his career collegiately at UNC Chapel Hill and then NC State")
  })
})
