import { describe, expect, it } from "vitest"
import { mapAcademics, mapCareerRecord, mapContact } from "@/lib/scouting-report"

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
