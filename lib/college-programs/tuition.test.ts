import { describe, expect, it } from "vitest"

import programs from "./programs-2026-27.json"
import { tuitionFacts, tuitionForSchool } from "./tuition"

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
