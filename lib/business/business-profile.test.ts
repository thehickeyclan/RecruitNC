import { describe, expect, it } from "vitest"
import { mayUseComparison } from "@/lib/compare-access"
import { canSeeProspectRanking, canSeeRankingOnProfile } from "@/lib/ranking-visibility"
import { releasesAssessment, releasesPersonalData } from "@/lib/scouting-report-access"
import { stripAcademicsForBusiness, stripPrivateAthleteFields } from "@/lib/athlete-private-fields"

/** Rhett's rule (Matt, 4 Nov 2026): a coach's view of a profile, minus contact and academics. */
describe("business account on profiles", () => {
  it("gets the coach tools", () => {
    expect(mayUseComparison({ profile: { role: "media" }, business: true })).toBe(true)
    expect(mayUseComparison({ profile: { role: "media" } })).toBe(false)
    expect(canSeeRankingOnProfile({ isBusiness: true })).toBe(true)
    expect(canSeeProspectRanking({ isBusiness: true })).toBe(true)
    expect(releasesAssessment("coach_no_pii")).toBe(true)
  })

  it("never gets contact details or academics", () => {
    expect(releasesPersonalData("coach_no_pii")).toBe(false)
    const row = stripAcademicsForBusiness(
      stripPrivateAthleteFields({ id: "a", name: "Kid", phone: "9195551234", contactEmail: "k@x.com", academic_gpa: "3.9", academic_interest: "Engineering", academic_summary: "Honor roll" }),
    )
    expect(row).toMatchObject({ id: "a", name: "Kid" })
    for (const f of ["phone", "contactEmail", "academic_gpa", "academic_interest", "academic_summary"]) expect(row).not.toHaveProperty(f)
  })
})
