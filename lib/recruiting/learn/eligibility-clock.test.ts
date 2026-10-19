import { describe, expect, it } from "vitest"

import { eligibilityClock } from "@/lib/recruiting/learn/eligibility-clock"

describe("eligibilityClock", () => {
  it("gives a typical senior all five years", () => {
    // Born March 2010, Class of 2028, straight to college in fall 2028: turns 19 in March 2029.
    const r = eligibilityClock({ birthYear: 2010, birthMonth: 3, classYear: 2028, plan: "college" })
    expect(r.starts).toEqual([2028])
    expect(r.seasons).toEqual([5])
    expect(r.model).toBe("new")
  })

  it("starts the clock at 19 for an older senior who takes a year off", () => {
    // Born February 2009, Class of 2027: turns 19 in February 2028, so the clock starts fall 2028 even without college.
    const r = eligibilityClock({ birthYear: 2009, birthMonth: 2, classYear: 2027, plan: "gap" })
    expect(r.ageFalls).toEqual([2028])
    expect(r.starts).toEqual([2028])
    expect(r.seasons).toEqual([5])
    // Two years off: enrolling fall 2029 leaves four.
    const late = eligibilityClock({ birthYear: 2008, birthMonth: 2, classYear: 2027, plan: "gap" })
    expect(late.starts).toEqual([2027])
    expect(late.seasons).toEqual([4])
  })

  it("counts junior college: the clock starts there", () => {
    const r = eligibilityClock({ birthYear: 2010, birthMonth: 3, classYear: 2028, plan: "juco2" })
    expect(r.collegeFall).toBe(2028)
    expect(r.d1Fall).toBe(2030)
    expect(r.seasons).toEqual([3])
  })

  it("does not guess a summer birthday", () => {
    // Born August 2007, Class of 2026, a year off: turns 19 in August 2026, enrolls fall 2027.
    const r = eligibilityClock({ birthYear: 2007, birthMonth: 8, classYear: 2026, plan: "gap" })
    expect(r.ageFalls).toEqual([2026, 2027])
    expect(r.seasons).toEqual([4, 5])
    // When enrollment comes first anyway, the summer question changes nothing.
    expect(eligibilityClock({ birthYear: 2009, birthMonth: 8, classYear: 2027, plan: "prep" }).seasons).toEqual([5])
  })

  it("says which rules apply", () => {
    expect(eligibilityClock({ birthYear: 2008, birthMonth: 1, classYear: 2026, plan: "college" }).model).toBe("better-of")
  })
})
