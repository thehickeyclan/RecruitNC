import { describe, expect, it } from "vitest"
import { buildFieldClubBreakdown, NO_CLUB_LABEL } from "./field-club-breakdown"

describe("buildFieldClubBreakdown", () => {
  it("merges spellings of the same club and labels with the common one", () => {
    const { slices, total } = buildFieldClubBreakdown([
      { wrestlingClub: "RAW" },
      { wrestlingClub: "RAW" },
      { wrestlingClub: "raw " },
      { wrestlingClub: "Combat" },
    ])
    expect(total).toBe(4)
    expect(slices[0]).toEqual({ club: "RAW", count: 3, percentage: 75 })
    expect(slices[1]).toEqual({ club: "Combat", count: 1, percentage: 25 })
  })

  it("keeps athletes with no club as their own slice, sorted last", () => {
    const { slices } = buildFieldClubBreakdown([{ wrestlingClub: "" }, { wrestlingClub: "RAW" }, {}])
    expect(slices.map((s) => s.club)).toEqual(["RAW", NO_CLUB_LABEL])
    expect(slices[1].count).toBe(2)
  })

  it("keeps one decimal so a small slice is not rounded to nothing", () => {
    const athletes = Array.from({ length: 70 }, (_, i) => ({ wrestlingClub: i === 0 ? "Solo" : "Big" }))
    const { slices } = buildFieldClubBreakdown(athletes)
    expect(slices.find((s) => s.club === "Solo")?.percentage).toBe(1.4)
  })

  it("returns nothing for an empty field rather than dividing by zero", () => {
    expect(buildFieldClubBreakdown([])).toEqual({ slices: [], total: 0 })
  })
})
