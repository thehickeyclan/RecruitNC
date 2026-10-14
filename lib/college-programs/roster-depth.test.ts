import { describe, expect, it } from "vitest"

import { depthAtWeights, depthFor, nearestCollegeWeights } from "./roster-depth"

describe("how deep a roster is at a wrestler's weight", () => {
  it("holds Muse's verified sizes, staff removed", () => {
    expect(depthFor("north-carolina-state-university-nc-state", "mens")?.size).toBe(32)
  })

  it("finds the college weights either side of a high school weight", () => {
    expect(nearestCollegeWeights(150, "mens")).toEqual([157, 149])
    expect(nearestCollegeWeights(157, "mens")).toEqual([157, 149])
    expect(nearestCollegeWeights(300, "mens")).toEqual([285])
    expect(nearestCollegeWeights(120, "womens")).toEqual([124, 117])
  })

  it("counts wrestlers and those in their final year at a weight", () => {
    const lehigh = depthFor("lehigh-university", "mens")!
    expect(depthAtWeights(lehigh, [149])).toEqual([{ weight: 149, wrestlers: 6, finalYear: 4 }])
  })

  it("says nothing at a weight for a team that publishes no weights", () => {
    const ncState = depthFor("north-carolina-state-university-nc-state", "mens")!
    expect(ncState.withWeight).toBe(0)
    expect(depthAtWeights(ncState, [157])).toBeNull()
  })
})
