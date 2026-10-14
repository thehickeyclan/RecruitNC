import { describe, expect, it } from "vitest"

import programs from "./programs-2026-27.json"
import { costFacts, costShort, tuitionFacts, tuitionForSchool } from "./tuition"

const school = (name: string) => programs.schools.find((s) => s.name.startsWith(name))!

describe("college tuition", () => {
  it("covers every school on the map but the one outside the United States", () => {
    const missing = programs.schools.filter((s) => !tuitionForSchool(s.id)).map((s) => s.name)
    expect(missing).toEqual(["Simon Fraser University"])
  })

  it("gives a North Carolina family the in-state price at home and the out-of-state price elsewhere", () => {
    const nc = programs.schools.find((s) => s.state === "NC" && tuitionForSchool(s.id)?.control === "Public")!
    expect(tuitionFacts(nc.id, nc.state)!.lines[0]).toMatch(/for North Carolina residents$/)
    const asu = school("Arizona State University")
    expect(tuitionFacts(asu.id, asu.state)!.lines[0]).toBe("$31,450 a year from out of state, which is what a North Carolina family pays")
  })

  it("shows one price where residency makes no difference", () => {
    const obu = school("Ouachita Baptist University")
    expect(tuitionFacts(obu.id, obu.state)).toEqual({ control: "Private", lines: ["$31,780 a year"] })
  })

  it("says a service academy charges nothing, and invents no figure where there is none", () => {
    const navy = school("United States Naval Academy")
    expect(tuitionFacts(navy.id, navy.state)!.lines).toEqual(["No tuition: a federal service academy"])
    expect(tuitionFacts("fort-hays-tech-northwest", "KS")!.lines).toEqual([])
    expect(tuitionFacts("simon-fraser-university", "BC")).toBeNull()
  })
})

describe("what a year costs", () => {
  it("adds fees, housing, food and books to tuition, at the rate a North Carolina family is charged, and says the year", () => {
    const uva = costFacts("university-of-virginia", "VA")!
    // The Department of Education's own page for Virginia: $59,512 tuition and fees out of state in 2024-25.
    expect(uva.headline).toBe("$79,512 a year from out of state, which is what a North Carolina family is charged (2024-25 price)")
    expect(uva.breakdown).toBe("Tuition and fees $59,512 · Housing and food $14,800 · Books and other costs $5,200")
    expect(uva.other).toBe("$41,803 for residents of the state")
    expect(uva.note).toMatch(/this year's will be higher/)
  })

  it("leads with the in-state price at a North Carolina public college, and one price at a private one", () => {
    const unc = school("University of North Carolina at Chapel Hill")
    expect(costFacts(unc.id, unc.state)!.headline).toMatch(/a year for North Carolina residents \(20\d\d-\d\d price\)$/)
    const duke = costFacts("duke-university", "NC")!
    expect(duke.headline).toMatch(/^\$[\d,]+ a year \(20\d\d-\d\d price\)$/)
    expect(duke.other).toBeNull()
  })

  it("is more than tuition alone, and carries a year, for every college", () => {
    let counted = 0
    for (const s of programs.schools) {
      const cost = costFacts(s.id, s.state)
      const tuition = tuitionForSchool(s.id)
      if (!cost) continue
      counted++
      expect(cost.headline, s.name).toMatch(/\((2023-24|2024-25) price\)$/)
      const total = Number(cost.headline.match(/\$([\d,]+)/)![1].replace(/,/g, ""))
      const tuitionOnly = (s.state === "NC" ? tuition?.inState : tuition?.outOfState) ?? 0
      expect(total, s.name).toBeGreaterThan(tuitionOnly)
    }
    expect(counted).toBeGreaterThanOrEqual(429)
  })

  it("falls back to tuition alone where no full price is published", () => {
    expect(costFacts("united-states-naval-academy-navy", "MD")).toBeNull()
    expect(costShort("united-states-naval-academy-navy", "MD")).toBe("No tuition (service academy)")
    expect(costShort("university-of-virginia", "VA")).toBe("$79,512 a year out-of-state: tuition, housing, food and books (2024-25 price, before aid)")
  })
})
