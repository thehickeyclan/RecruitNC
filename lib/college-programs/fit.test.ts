import { describe, expect, it } from "vitest"

import { fitForSchool, netPriceFor, satTotalRange, scorePlacement } from "./fit"

describe("comparing colleges for a family", () => {
  it("places a score against the middle half of admitted students, and says nothing without both", () => {
    expect(scorePlacement(1500, [1400, 1480])).toBe("above")
    expect(scorePlacement(1420, [1400, 1480])).toBe("within")
    expect(scorePlacement(1200, [1400, 1480])).toBe("below")
    expect(scorePlacement(null, [1400, 1480])).toBeNull()
    expect(scorePlacement(1200, [null, null])).toBeNull()
  })

  it("adds the two SAT sections into one range", () => {
    expect(satTotalRange(fitForSchool("university-of-virginia")!)).toEqual([1410, 1530])
  })

  it("never shows an in-state net price to a North Carolina family at an out-of-state public college", () => {
    const uva = fitForSchool("university-of-virginia")!
    expect(netPriceFor(uva, "VA", 2)).toEqual({ amount: null, note: "Published for in-state students only. Use the college's calculator." })
    const ncState = fitForSchool("north-carolina-state-university-nc-state")!
    expect(netPriceFor(ncState, "NC", 2).amount).toBe(13992)
    // A private college's figure applies wherever the family lives.
    expect(netPriceFor(fitForSchool("hofstra-university")!, "NY", 0).amount).toBe(29667)
  })

  it("covers the colleges the cost figures cover", () => {
    expect(fitForSchool("gardner-webb-university")?.setting).toBe("Rural")
    expect(fitForSchool("simon-fraser-university")).toBeNull()
  })
})
