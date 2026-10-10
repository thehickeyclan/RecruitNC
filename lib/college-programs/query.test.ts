import { describe, expect, it } from "vitest"

import { normalizeDivision, queryCollegePrograms } from "./query"

// Expected numbers are the spreadsheets' Summary tabs: programs (9 Oct 2026) less NJCU, which the
// staff workbook (10 Oct 2026) removed - its wrestling merged into Kean. 626 = 426 men's + 200 women's.
describe("queryCollegePrograms", () => {
  it("matches the spreadsheet totals", () => {
    const r = queryCollegePrograms({})
    expect(r.totals).toEqual({ schools: 436, programs: 626, mens: 426, womens: 200 })
    expect(r.summary).toBe("436 schools have college wrestling in 2026-27, with 626 programs (426 men's, 200 women's).")
  })

  it("says the filters in its summary", () => {
    expect(queryCollegePrograms({ division: "D1", gender: "womens" }).summary).toBe(
      "7 schools have women's D1 college wrestling in 2026-27, with 7 programs.",
    )
    expect(queryCollegePrograms({ state: "NC" }).summary).toMatch(/^12 schools in North Carolina have college wrestling/)
  })

  it("matches the spreadsheet by division", () => {
    const rows = Object.fromEntries(queryCollegePrograms({}).by_division.map((d) => [d.short, [d.schools, d.mens, d.womens]]))
    expect(rows).toEqual({
      D1: [80, 78, 7],
      D2: [84, 77, 44],
      D3: [136, 134, 78],
      NAIA: [75, 74, 46],
      NJCAA: [63, 63, 25],
    })
  })

  it("counts a two-division school once in the total and once in each division", () => {
    const r = queryCollegePrograms({ query: "Edinboro" })
    expect(r.totals.schools).toBe(1)
    expect(r.by_division.map((d) => d.short)).toEqual(["D1", "D2"])
    expect(r.schools[0].programs).toEqual(["D1 · men's · Mid-American Conference", "D2 · women's"])
  })

  it("filters by state name or code, division and gender together", () => {
    expect(queryCollegePrograms({ state: "North Carolina" }).totals.schools).toBe(12)
    expect(queryCollegePrograms({ state: "nc" }).totals.schools).toBe(12)
    const r = queryCollegePrograms({ division: "D1", gender: "women" })
    expect(r.totals).toEqual({ schools: 7, programs: 7, mens: 0, womens: 7 })
  })

  it("reports filters it cannot read instead of ignoring them", () => {
    const r = queryCollegePrograms({ state: "Narnia", division: "D7" })
    expect(r.filters.unrecognised).toEqual(['division "D7"', 'state "Narnia"'])
  })

  it("reads the usual ways people write a division", () => {
    expect(normalizeDivision("Division I")).toBe("NCAA Division I")
    expect(normalizeDivision("D-II")).toBe("NCAA Division II")
    expect(normalizeDivision("juco")).toBe("NJCAA")
  })
  it("drops NJCU, whose wrestling merged into Kean", () => {
    expect(queryCollegePrograms({ query: "New Jersey City" }).totals.schools).toBe(0)
    expect(queryCollegePrograms({ query: "Kean" }).totals.schools).toBe(1)
  })

  it("attaches staff, head coach first, to a small result and never an email", () => {
    const [school] = queryCollegePrograms({ query: "Arizona State" }).schools
    expect(school.staff?.[0]).toMatchObject({ name: "Zeke Jones", head_coach: true })
    expect(JSON.stringify(school.staff)).not.toContain("@")
    expect(queryCollegePrograms({ division: "D1" }).schools[0].staff).toBeUndefined()
  })

  it("finds where a coach works", () => {
    const r = queryCollegePrograms({ coach: "zeke jones" })
    expect(r.coach?.found).toBe(true)
    expect(r.schools.map((s) => s.name)).toEqual(["Arizona State University"])
    expect(queryCollegePrograms({ coach: "Nobody Atall" }).coach?.found).toBe(false)
  })

  it("answers a school and a coach asked together, instead of intersecting them", () => {
    const r = queryCollegePrograms({ query: "Campbell", coach: "Zeke Jones" })
    expect(r.schools.map((s) => s.name)).toContain("Campbell University")
    expect(r.coach?.roles).toEqual([
      expect.objectContaining({ school: "Arizona State University", title: "Head Coach", division: "D1" }),
    ])
  })
})
