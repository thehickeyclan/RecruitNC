import { describe, expect, it } from "vitest"
import { decideGradYear, gradYearTier } from "@/lib/identity/grad-year-source"

describe("gradYearTier", () => {
  it("ranks a state tournament's grade column above an outlet's", () => {
    expect(gradYearTier("WV state tournament grade column")).toBe("state_tournament_grade")
    expect(gradYearTier("NHSCA grade division")).toBe("nhsca_grade_division")
    expect(gradYearTier("rankings-grade-division")).toBe("state_rankings_grade")
    expect(gradYearTier("SI preseason list")).toBe("national_outlet_grade")
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
