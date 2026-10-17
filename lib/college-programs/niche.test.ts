import { describe, expect, it } from "vitest"

import { gradePoints, nicheFor } from "@/lib/college-programs/niche"

describe("niche grades", () => {
  it("orders grades A+ down to F", () => {
    const order = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F"].map(gradePoints)
    expect([...order].sort((a, b) => b! - a!)).toEqual(order)
    expect(gradePoints("unavailable")).toBeNull()
  })
  it("has the colleges Matt checked", () => {
    expect(nicheFor("presbyterian-college")?.grades).toMatchObject({ overall: "B-", dorms: "C+", safety: "C" })
  })
  it("leaves out the categories Matt dropped", () => {
    const grades = nicheFor("presbyterian-college")!.grades as Record<string, string>
    for (const k of ["party_scene", "athletics", "diversity", "student_wellness", "future_readiness"]) expect(grades[k]).toBeUndefined()
    expect(Object.keys(grades).sort()).toEqual(["academics", "campus", "campus_food", "dorms", "location", "overall", "professors", "safety", "student_life", "value"])
  })
})
