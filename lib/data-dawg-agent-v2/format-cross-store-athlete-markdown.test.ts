import { describe, expect, it } from "vitest"
import {
  crossStoreHasUsefulHits,
  formatCrossStoreAthleteMarkdown,
} from "./format-cross-store-athlete-markdown"

describe("formatCrossStoreAthleteMarkdown", () => {
  it("formats Brandon Palmer-style NCHSAA alumni hits", () => {
    const md = formatCrossStoreAthleteMarkdown("Brandon Palmer", {
      nchsaa_state: [
        {
          wrestler_name: "Brandon Palmer",
          place: 1,
          year: 2002,
          classification: "4A",
          weight_class: "125",
          school: "Riverside-Durham",
        },
        {
          wrestler_name: "Brandon Palmer",
          place: 1,
          year: 2001,
          classification: "4A",
          weight_class: "125",
          school: "Riverside-Durham",
        },
      ],
      total_hits: 2,
    })
    expect(md).toContain("Brandon Palmer")
    expect(md).toContain("Riverside-Durham")
    expect(md).toContain("2002")
    expect(md).toContain("1st place")
    expect(md).not.toContain("feel free to ask")
  })

  it("detects useful hits", () => {
    expect(crossStoreHasUsefulHits({ total_hits: 2 })).toBe(true)
    expect(crossStoreHasUsefulHits({ nchsaa_state: [{ year: 2001 }] })).toBe(true)
    expect(crossStoreHasUsefulHits({})).toBe(false)
  })
})
