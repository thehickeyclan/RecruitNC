import { describe, expect, it } from "vitest"
import { buildNameIndex, decideLink, gradYearFromDivision, type AthleteForLink } from "@/lib/identity/result-athlete-link"

const athlete = (over: Partial<AthleteForLink>): AthleteForLink => ({
  id: "a1",
  name: "Campbell Tufts",
  wrestlingName: null,
  graduationYear: 2027,
  highSchool: "Raleigh Ravenscroft",
  state: "NC",
  ...over,
})

describe("decideLink", () => {
  it("links one profile the school corroborates", () => {
    const d = decideLink({ name: "Campbell Tufts", school: "Ravenscroft", year: 2026 }, [athlete({})])
    expect(d.status).toBe("linked")
  })

  it("links on an NHSCA division that pins the class year, with no school", () => {
    // 2026 Junior is the class of 2027.
    const d = decideLink({ name: "Campbell Tufts", school: null, year: 2026, division: "Junior" }, [athlete({ highSchool: null })])
    expect(d.status).toBe("linked")
  })

  it("rejects a namesake whose division points at another class", () => {
    const d = decideLink({ name: "Campbell Tufts", school: null, year: 2026, division: "Freshman" }, [athlete({ highSchool: null })])
    expect(d).toMatchObject({ status: "no_match", reason: "namesake_rejected" })
  })

  it("rejects a namesake from another school years outside the career", () => {
    // Joshua Wilson: a 2020 runner-up is not the 2027 wrestler.
    const d = decideLink(
      { name: "Joshua Wilson", school: "Swansboro", year: 2020 },
      [athlete({ name: "Joshua Wilson", highSchool: "Richlands", graduationYear: 2027 })],
    )
    expect(d).toMatchObject({ status: "no_match", reason: "namesake_rejected" })
  })

  it("rejects a namesake from another state", () => {
    const d = decideLink({ name: "Campbell Tufts", school: null, year: 2026, state: "VA" }, [athlete({ highSchool: null })])
    expect(d.status).toBe("no_match")
  })

  it("sends name-only matches to review instead of guessing", () => {
    const d = decideLink({ name: "Campbell Tufts", school: null, year: 2026 }, [athlete({ highSchool: null })])
    expect(d.status).toBe("review")
  })

  it("sends two profiles of one name to review", () => {
    const d = decideLink({ name: "Campbell Tufts", school: "Ravenscroft", year: 2026 }, [athlete({}), athlete({ id: "a2" })])
    expect(d.status).toBe("review")
  })

  it("leaves rows with no profile unlinked", () => {
    expect(decideLink({ name: "Nobody Here", school: "X", year: 2026 }, [athlete({})])).toMatchObject({ status: "no_match", reason: "no_profile" })
  })

  it("confirms an existing link the record agrees with, and flags one it contradicts", () => {
    expect(decideLink({ name: "Campbell Tufts", school: "Ravenscroft", year: 2026, existingAthleteId: "a1" }, [athlete({})]).status).toBe("linked")
    expect(decideLink({ name: "Campbell Tufts", school: "Ravenscroft", year: 2026, existingAthleteId: "zz" }, [athlete({})]).status).toBe("review")
  })
})

describe("gradYearFromDivision", () => {
  it("reads the grade", () => {
    expect(gradYearFromDivision("Junior", 2026)).toBe(2027)
    expect(gradYearFromDivision("Senior", 2026)).toBe(2026)
    expect(gradYearFromDivision("16U Freestyle", 2026)).toBeNull()
  })
})

describe("buildNameIndex", () => {
  it("finds a hyphenated surname by either half", () => {
    const find = buildNameIndex([athlete({})])
    expect(find("Campbell Tufts-piercy")).toHaveLength(1)
  })
})
