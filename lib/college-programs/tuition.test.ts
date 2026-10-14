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
  it("adds fees, housing, food and books to tuition, at the rate a North Carolina family is charged", () => {
    const uva = costFacts("university-of-virginia", "VA")!
    // The Department of Education's own page for Virginia: $58,014 tuition and fees out of state in 2023-24.
    expect(uva.headline).toBe("$76,954 a year from out of state, which is what a North Carolina family is charged")
    expect(uva.breakdown).toBe("Tuition and fees $58,014 · Housing and food $13,940 · Books and other costs $5,000")
    expect(uva.other).toBe("$39,926 for residents of the state")
  })

  it("leads with the in-state price at a North Carolina public college, and one price at a private one", () => {
    const unc = school("University of North Carolina at Chapel Hill")
    expect(costFacts(unc.id, unc.state)!.headline).toMatch(/a year for North Carolina residents$/)
    const duke = costFacts("duke-university", "NC")!
    expect(duke.headline).toBe("$87,072 a year")
    expect(duke.other).toBeNull()
  })

  it("is never less than tuition alone, for any college", () => {
    for (const s of programs.schools) {
      const cost = costFacts(s.id, s.state)
      const tuition = tuitionForSchool(s.id)
      if (!cost || !tuition?.outOfState) continue
      const total = Number(cost.headline.replace(/[^0-9]/g, "").slice(0, cost.headline.match(/\$[0-9,]+/)![0].replace(/[^0-9]/g, "").length))
      expect(total, s.name).toBeGreaterThan(s.state === "NC" ? (tuition.inState ?? 0) : tuition.outOfState)
    }
  })

  it("falls back to tuition alone where no full price is published", () => {
    expect(costFacts("united-states-naval-academy-navy", "MD")).toBeNull()
    expect(costShort("united-states-naval-academy-navy", "MD")).toBe("No tuition (service academy)")
    expect(costShort("university-of-virginia", "VA")).toBe("$76,954 a year out-of-state, tuition, housing and food, 2023-24, before aid")
  })
})
