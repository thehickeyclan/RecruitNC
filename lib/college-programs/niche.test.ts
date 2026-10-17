import { describe, expect, it } from "vitest"

import { gradePoints, nicheFor } from "@/lib/college-programs/niche"

describe("niche grades", () => {
  it("orders grades A+ down to F", () => {
    const order = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F"].map(gradePoints)
    expect([...order].sort((a, b) => b! - a!)).toEqual(order)
    expect(gradePoints("unavailable")).toBeNull()
  })
  it("has the colleges Matt checked", () => {
    expect(nicheFor("presbyterian-college")?.grades).toMatchObject({ overall: "B-", party_scene: "B+", safety: "C", student_wellness: "A" })
    expect(nicheFor("presbyterian-college")?.grades.future_readiness).toBeUndefined()
  })
})
