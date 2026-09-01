import { describe, expect, it } from "vitest"
import { currentClassYears, mostRecentGraduatedClassYear, seniorClassYear } from "./class-years"

describe("class years", () => {
  it("rolls over on 1 July, not 1 January", () => {
    expect(seniorClassYear(new Date("2026-06-30T12:00:00"))).toBe(2026)
    expect(seniorClassYear(new Date("2026-07-01T12:00:00"))).toBe(2027)
  })

  it("excludes the class that has just graduated", () => {
    /** The case that prompted this: 2026 was still being offered in September. */
    expect(currentClassYears(new Date("2026-09-01T12:00:00"))).toEqual([2027, 2028, 2029, 2030])
    expect(mostRecentGraduatedClassYear(new Date("2026-09-01T12:00:00"))).toBe(2026)
  })

  it("still counts the seniors during their own spring", () => {
    expect(currentClassYears(new Date("2027-03-01T12:00:00"))).toEqual([2027, 2028, 2029, 2030])
  })

  it("moves on its own the following summer", () => {
    expect(currentClassYears(new Date("2027-08-15T12:00:00"))).toEqual([2028, 2029, 2030, 2031])
  })
})
