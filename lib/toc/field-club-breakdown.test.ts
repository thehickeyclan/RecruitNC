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
    expect(slices[0]).toEqual({ club: "RAW", count: 3, percentage: 75, athletes: [] })
    expect(slices[1]).toEqual({ club: "Combat", count: 1, percentage: 25, athletes: [] })
  })

  it("keeps athletes with no club as their own slice, sorted last", () => {
    const { slices } = buildFieldClubBreakdown([{ wrestlingClub: "" }, { wrestlingClub: "RAW" }, {}])
    expect(slices.map((s) => s.club)).toEqual(["RAW", NO_CLUB_LABEL])
    expect(slices[1].count).toBe(2)
  })

  it("lists who is in each slice so the grouping can be checked", () => {
    const { slices } = buildFieldClubBreakdown([
      { name: "Gavin Lopez", wrestlingClub: "RAW" },
      { name: "Aiden White", wrestlingClub: "raw" },
      { name: "Mia Kiser", wrestlingClub: "Combat" },
    ])
    expect(slices[0].athletes).toEqual(["Aiden White", "Gavin Lopez"])
    expect(slices[1].athletes).toEqual(["Mia Kiser"])
  })

  it("keeps one decimal so a small slice is not rounded to nothing", () => {
    const athletes = Array.from({ length: 70 }, (_, i) => ({ wrestlingClub: i === 0 ? "Solo" : "Big" }))
    const { slices } = buildFieldClubBreakdown(athletes)
    expect(slices.find((s) => s.club === "Solo")?.percentage).toBe(1.4)
  })

  it("counts RAW's other names and RAW West as RAW", () => {
    // The case that broke: seven wrestlers entered as "RAW", one as "Raleigh Area Wolfpack", one
    // as "RAW WEST". RAW is one club for analytics, so all of them belong in one slice.
    const { slices, total } = buildFieldClubBreakdown([
      { name: "Ayden Sumners", wrestlingClub: "RAW" },
      { name: "Jordan Barbee", wrestlingClub: "Raleigh Area Wolfpack" },
      { name: "Someone Else", wrestlingClub: "Raleigh Area Wrestling" },
      { name: "John Perez", wrestlingClub: "RAW WEST" },
      { name: "Adam Walker", wrestlingClub: "Combat" },
    ])
    expect(total).toBe(5)
    expect(slices[0]).toMatchObject({ club: "RAW", count: 4, percentage: 80 })
    expect(slices[0].athletes).toEqual(["Ayden Sumners", "John Perez", "Jordan Barbee", "Someone Else"])
    expect(slices[1]).toMatchObject({ club: "Combat", count: 1 })
  })

  it("returns nothing for an empty field rather than dividing by zero", () => {
    expect(buildFieldClubBreakdown([])).toEqual({ slices: [], total: 0 })
  })
})
