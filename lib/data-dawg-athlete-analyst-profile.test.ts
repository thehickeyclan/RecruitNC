import { describe, expect, it } from "vitest"
import {
  buildAnalystClosingSentence,
  buildAnalystLeadParagraph,
  buildCareerSnapshotMarkdown,
  buildHistoricalContextBullets,
  buildHistoricalRankingsMarkdown,
  buildNationalResumeMarkdown,
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
  schoolDualTitlesInWindow: 1,
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
    expect(snap).toContain("Committed to Appalachian State")
  })
})

describe("buildHistoricalContextBullets", () => {
  it("uses verified four-time + 200+ wins context", () => {
    const ctx = buildHistoricalContextBullets(sly)
    expect(ctx).toContain("Historical context:")
    expect(ctx).toContain("four-time")
    expect(ctx).toContain("over 200")
    expect(ctx).toContain("#18")
  })
})

describe("buildHistoricalRankingsMarkdown", () => {
  it("includes career wins and 4x champion standing", () => {
    const r = buildHistoricalRankingsMarkdown(sly)
    expect(r).toContain("Career wins — #18")
    expect(r).toContain("4× champions")
    expect(r).toContain("State titles — T-1")
  })
})

describe("buildNationalResumeMarkdown", () => {
  it("groups nationals and frames achievements over bare records", () => {
    const md = buildNationalResumeMarkdown({
      nhsca: [
        { year: 2024, placement: "3rd", record: "", weight: "132", division: "Junior" },
        { year: 2026, placement: "2nd", record: "", weight: "150", division: "Senior" },
      ],
      fargo: [{ year: 2026, placement: "", record: "6-2", weight: "150", division: "Junior" }],
      graduationYear: 2026,
    })
    expect(md).toContain("National résumé:")
    expect(md).toContain("NHSCA")
    expect(md).toContain("Runner-up")
    expect(md).toContain("Fargo")
    expect(md).toContain("Blood Round")
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
