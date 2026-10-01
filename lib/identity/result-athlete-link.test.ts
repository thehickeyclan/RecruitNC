import { describe, expect, it } from "vitest"
import { buildNameIndex, decideLink, gradYearFromDivision, looseNameMatch, schoolsMatch, type AthleteForLink } from "@/lib/identity/result-athlete-link"

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

  it("does not reject a wrestler who wrestled up a division", () => {
    // Isaac Young, class of 2029, in the 2026 Junior bracket: allowed, and not a namesake.
    const d = decideLink({ name: "Campbell Tufts", school: null, year: 2026, division: "Senior" }, [athlete({ highSchool: null })])
    expect(d.status).not.toBe("no_match")
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

  it("links one profile when the source lists no school and the class year fits", () => {
    const d = decideLink({ name: "Campbell Tufts", school: null, year: 2026 }, [athlete({})])
    expect(d.status).toBe("linked")
  })

  it("sends a different school to review: transfer or namesake is a person's call", () => {
    const d = decideLink({ name: "Campbell Tufts", school: "Broughton", year: 2026 }, [athlete({})])
    expect(d.status).toBe("review")
  })

  it("sends a name with nothing to check it against to review", () => {
    const d = decideLink({ name: "Campbell Tufts", school: null, year: null }, [athlete({})])
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

describe("schoolsMatch", () => {
  it("forgives how brackets spell a school", () => {
    expect(schoolsMatch("Pine Forest", "Pine Forrest")).toBe(true)
    expect(schoolsMatch("Mt. Pleasant", "Mount Pleasant")).toBe(true)
    expect(schoolsMatch("Fred T. Foard", "Fred T Foard")).toBe(true)
    expect(schoolsMatch("St. Stephens", "Saint Stephens")).toBe(true)
    expect(schoolsMatch("Newton-Conover", "Newton Conover")).toBe(true)
    expect(schoolsMatch("East Davidson", "East Davison")).toBe(true)
    expect(schoolsMatch("CATA", "Central Academy of Technology and Arts")).toBe(true)
  })

  it("still tells different schools apart", () => {
    expect(schoolsMatch("Cardinal Gibbons", "Franklinton")).toBe(false)
    expect(schoolsMatch("East Surry", "Mount Airy")).toBe(false)
    expect(schoolsMatch("Laney", "Forbush")).toBe(false)
    expect(schoolsMatch("Albemarle", "South Stanly")).toBe(false)
  })
})

describe("a school column that may hold a club", () => {
  it("does not count a club name against the wrestler", () => {
    // Super 32 2023 lists Carson Worrick under "Valley"; he wrestles for Davie.
    const d = decideLink(
      { name: "Campbell Tufts", school: "Valley", year: 2026, schoolMayBeClub: true },
      [athlete({})],
    )
    expect(d.status).toBe("linked")
  })

  it("still rejects a namesake whose years fall outside the career", () => {
    const d = decideLink(
      { name: "Campbell Tufts", school: "Valley", year: 2015, schoolMayBeClub: true },
      [athlete({})],
    )
    expect(d.status).not.toBe("linked")
  })
})

describe("looseNameMatch", () => {
  it("reads past import quirks", () => {
    expect(looseNameMatch("Garrison Raper China", "Garrison Raper")).toBe(true)
    expect(looseNameMatch("Jalen Terry-Winston", "Jalen Terry")).toBe(true)
    expect(looseNameMatch("Favio Jaramillo Esparza", "Favio Jaramillo")).toBe(true)
    expect(looseNameMatch("Abdel Adams", "Abdel Adam")).toBe(true)
  })
  it("accepts a nickname for the first name", () => {
    expect(looseNameMatch("Joshua Figueredo Morehead", "Josh Figueredo")).toBe(true)
  })
  it("never crosses first names", () => {
    expect(looseNameMatch("Julian Figueredo", "Josh Figueredo")).toBe(false)
  })
})

describe("loose names and graduation", () => {
  it("links a loose name only when the school backs it up", () => {
    // NHSCA printed "Garrison Raper China" / "Grove": the school rebuilt from both pieces agrees.
    const a = athlete({ name: "Garrison Raper", highSchool: "China Grove" })
    expect(decideLink({ name: "Garrison Raper China", school: "Grove", year: 2026 }, [a]).status).toBe("linked")
    // "Grove" must not stand in for a different Grove.
    const b = athlete({ name: "Garrison Raper", highSchool: "Providence Grove" })
    expect(decideLink({ name: "Garrison Raper China", school: "Grove", year: 2026 }, [b]).status).not.toBe("linked")
  })
  it("rejects a state result from before his freshman season", () => {
    // Class of 2027: first state tournament is February 2024.
    expect(decideLink({ name: "Campbell Tufts", school: "Ravenscroft", year: 2023, highSchoolSeason: true }, [athlete({})]).status).toBe("no_match")
    expect(decideLink({ name: "Campbell Tufts", school: "Ravenscroft", year: 2024, highSchoolSeason: true }, [athlete({})]).status).toBe("linked")
  })

  it("allows an NCISA state result in middle school", () => {
    // Josh Stonebraker: 2023 NCISA title at Cary Christian as an 8th grader, class of 2027.
    expect(decideLink({ name: "Campbell Tufts", school: "Ravenscroft", year: 2023, highSchoolSeason: true, middleSchoolEligible: true }, [athlete({})]).status).toBe("linked")
  })

  it("accepts the school as printed for a loose name", () => {
    const a = athlete({ name: "Favio Jaramillo", highSchool: "Cedar Ridge", graduationYear: 2026 })
    expect(decideLink({ name: "Favio Jaramillo Esparza", school: "Cedar Ridge", year: 2026 }, [a]).status).toBe("linked")
  })

  it("rejects a high-school result dated after his class graduated", () => {
    const d = decideLink(
      { name: "Campbell Tufts", school: "Ravenscroft", year: 2029, highSchoolSeason: true },
      [athlete({})],
    )
    expect(d.status).toBe("no_match")
  })
})
