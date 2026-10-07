import { describe, expect, it } from "vitest"
import { decideGradYear, gradYearImpossible, gradYearTier } from "@/lib/identity/grad-year-source"

describe("gradYearTier", () => {
  it("ranks a state tournament's grade column above an outlet's", () => {
    expect(gradYearTier("WV state tournament grade column")).toBe("state_tournament_grade")
    expect(gradYearTier("NHSCA grade division")).toBe("nhsca_grade_division")
    expect(gradYearTier("rankings-grade-division")).toBe("state_rankings_grade")
    expect(gradYearTier("SI preseason list")).toBe("national_outlet_grade")
  })

  it("ranks an evidenced web lookup above a ranking service and below a grade division", () => {
    expect(gradYearTier("web-lookup: class-of listing, school matched")).toBe("verified_web_lookup")
    expect(gradYearTier("school roster")).toBe("verified_web_lookup")
    const beatsRanking = decideGradYear({
      held: 2028,
      heldSource: "rankwrestlers-2026-27-preseason",
      incoming: 2027,
      incomingSource: "web-lookup class-of listing",
    })
    expect(beatsRanking.verdict).toBe("replace")
    const losesToDivision = decideGradYear({
      held: 2027,
      heldSource: "NHSCA grade division",
      incoming: 2028,
      incomingSource: "web-lookup class-of listing",
    })
    expect(losesToDivision.verdict).toBe("keep")
  })

  it("treats an unlabelled source as the weakest, so it can only fill blanks", () => {
    expect(gradYearTier(null)).toBe("national_outlet_grade")
    expect(gradYearTier("some file nobody labelled")).toBe("national_outlet_grade")
  })
})

describe("decideGradYear", () => {
  const base = { heldSource: "NHSCA grade division", incomingSource: "rankings-grade-division" }

  it("fills a blank from any source", () => {
    expect(decideGradYear({ ...base, held: null, incoming: 2028 }).verdict).toBe("fill")
  })

  it("refuses a ranking outlet against a state tournament", () => {
    /*
     * Justice Anthony, 6 Oct 2026: West Virginia recorded grade 11 in 2025 and grade 12 in 2026,
     * so she graduated in 2026. SI's 2026-27 preseason list had her as a senior, which would make
     * it 2027 — the same graduate-carried-forward error as MatScouts' class-of-2027 board.
     */
    const d = decideGradYear({
      held: 2026,
      heldSource: "WV state tournament grade column: grade 11 in season 2025, grade 12 in season 2026",
      incoming: 2027,
      incomingSource: "SI 2026-27 preseason list",
    })
    expect(d.verdict).toBe("keep")
    expect(d.reason).toMatch(/weaker/)
  })

  it("lets a state tournament correct a ranking service", () => {
    const d = decideGradYear({
      held: 2027,
      heldSource: "rankings-grade-division",
      incoming: 2026,
      incomingSource: "state tournament grade",
    })
    expect(d.verdict).toBe("replace")
  })

  it("never lets a file overrule a person", () => {
    const d = decideGradYear({
      held: 2026,
      heldSource: "rankings-grade-division",
      heldConfirmed: true,
      incoming: 2027,
      incomingSource: "state tournament grade",
    })
    expect(d.verdict).toBe("keep")
    expect(d.reason).toMatch(/adjudicated/)
  })

  it("will not replace a value whose origin was never recorded", () => {
    // Most of what we hold predates the provenance field and may itself be the stronger source.
    const d = decideGradYear({ held: 2026, heldSource: null, incoming: 2027, incomingSource: "state tournament grade" })
    expect(d.verdict).toBe("conflict")
    expect(d.reason).toMatch(/no recorded source/)
  })

  it("calls two sources of equal standing a conflict rather than picking one", () => {
    const d = decideGradYear({
      held: 2026,
      heldSource: "state tournament grade",
      incoming: 2027,
      incomingSource: "state tournament grade",
    })
    expect(d.verdict).toBe("conflict")
  })

  it("says nothing when the sources agree", () => {
    expect(decideGradYear({ ...base, held: 2028, incoming: 2028 }).verdict).toBe("keep")
  })
})

describe("gradYearImpossible", () => {
  it("refuses a class year that precedes a season the wrestler competed in", () => {
    // From the podium sweep: Landon Williams (GA) came back as 2024 having wrestled in 2026.
    expect(gradYearImpossible(2024, 2026)).toMatch(/wrestled in the 2026 season/)
    expect(gradYearImpossible(2025, 2026)).toBeTruthy()
  })

  it("refuses one too far out to be a high school career", () => {
    // Caio Sainz (FL) came back as 2032 off the 2026 season — six years, so sixth grade.
    expect(gradYearImpossible(2032, 2026)).toMatch(/6 years after/)
  })

  it("accepts every grade a wrestler could actually be in", () => {
    for (const gy of [2026, 2027, 2028, 2029, 2030]) expect(gradYearImpossible(gy, 2026)).toBeNull()
  })

  it("says nothing when we have no season to check against", () => {
    expect(gradYearImpossible(2027, null)).toBeNull()
    expect(gradYearImpossible(2027, 0)).toBeNull()
  })
})
