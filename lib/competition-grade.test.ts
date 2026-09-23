import { describe, expect, it } from "vitest"
import { buildCompetitionGrade } from "./competition-grade"

const grade = (rankedWins: number, nationalEvents: number, offSeasonEvents: number) =>
  buildCompetitionGrade({ rankedWins, nationalEvents, offSeasonEvents })

describe("buildCompetitionGrade", () => {
  it("is red for a wrestler who has not been tested", () => {
    // Alex Johnson, Jalen Bethea, Marcos Sagahon and three more sit exactly here: ranked in
    // their class, zero ranked wins, never left the state, in-season only.
    const g = grade(0, 0, 0)
    expect(g.band).toBe("red")
    expect(g.label).toBe("Untested")
    expect(g.verdict).toContain("A state title alone does not answer this")
  })

  it("is green only when all three hold", () => {
    // Tye Johnson: 10 ranked wins, 3 national events, 10 off-season events.
    expect(grade(10, 3, 10).band).toBe("green")
    expect(grade(10, 3, 10).nextStep).toBeNull()
  })

  it("does not go green on in-state wins alone", () => {
    // Donovan Edwards has 8 wins over ranked opponents and has never left North Carolina.
    // That is the exact case this grade exists to call out.
    const g = grade(8, 0, 0)
    expect(g.band).not.toBe("green")
    expect(g.factors.find((f) => f.key === "national")?.detail).toBe("Has not competed nationally")
  })

  it("always names the cheapest way up, except at the top", () => {
    expect(grade(0, 0, 0).nextStep).toBe("Beat a ranked opponent")
    expect(grade(8, 0, 2).nextStep).toBe("Enter a national event — NHSCA, Fargo, Super 32 or Journeymen")
    expect(grade(10, 4, 10).nextStep).toBeNull()
  })

  it("counts toward the real top quarter, not a round number", () => {
    // p75 across ranked NC wrestlers: 5 ranked wins, 2 national events, 3 off-season events.
    expect(grade(5, 2, 3).score).toBe(6)
    expect(grade(4, 1, 2).score).toBe(3)
  })

  it("tells a one-win wrestler how many more, not just 'more'", () => {
    expect(grade(3, 0, 0).factors[0].nextStep).toBe("Beat 2 more ranked opponents")
    expect(grade(4, 0, 0).factors[0].nextStep).toBe("Beat 1 more ranked opponent")
  })
})
