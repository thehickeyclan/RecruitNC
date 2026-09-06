import { describe, expect, it } from "vitest"
import { findSignificantLosses, findSignificantWins, isLoss, isWin, type OpponentIndex } from "./significant-wins"

const index: OpponentIndex = {
  tocField: ["Adam Walker", "Liam Myles"],
  ranked: [
    { name: "Jack Gilson", ranking: 7, graduationYear: 2029 },
    { name: "Brandon Lefler", ranking: 5, graduationYear: 2029 },
  ],
}

const bout = (over: Partial<Parameters<typeof findSignificantWins>[0][number]> = {}) => ({
  opponent: "Adam Walker",
  win_loss: "W",
  date: "3/14/2026",
  venue: "Interstate 64 Spring Duals",
  result: "DEC",
  weight: 113,
  opponent_school: "Holly Springs",
  ...over,
})

describe("findSignificantWins", () => {
  it("keeps a win over somebody in the TOC field", () => {
    const wins = findSignificantWins([bout()], index)
    expect(wins).toHaveLength(1)
    expect(wins[0]).toMatchObject({ opponent: "Adam Walker", reason: "toc-field", event: "Interstate 64 Spring Duals" })
  })

  it("keeps a win over a ranked prospect from an unpublished class", () => {
    const wins = findSignificantWins([bout({ opponent: "Jack Gilson" })], index)
    expect(wins[0]).toMatchObject({ reason: "ranked", opponentGraduationYear: 2029 })
  })

  it("drops a win over nobody in particular", () => {
    expect(findSignificantWins([bout({ opponent: "Some Kid" })], index)).toEqual([])
  })

  it("drops losses, however they are spelled", () => {
    expect(findSignificantWins([bout({ win_loss: "L" })], index)).toEqual([])
    expect(findSignificantWins([bout({ win_loss: null, result: "LOSS" })], index)).toEqual([])
  })

  it("does not credit a win over a name that merely looks similar", () => {
    expect(findSignificantWins([bout({ opponent: "Adam Walkerson" })], index)).toEqual([])
  })

  it("counts the same opponent on different days separately", () => {
    const wins = findSignificantWins([bout(), bout({ date: "11/15/2025" })], index)
    expect(wins).toHaveLength(2)
  })

  it("collapses the same bout stored twice", () => {
    expect(findSignificantWins([bout(), bout()], index)).toHaveLength(1)
  })

  it("puts TOC opponents first, then the most recent", () => {
    const wins = findSignificantWins(
      [
        bout({ opponent: "Jack Gilson", date: "3/20/2026" }),
        bout({ opponent: "Adam Walker", date: "11/15/2025" }),
        bout({ opponent: "Liam Myles", date: "3/14/2026" }),
      ],
      index,
    )
    expect(wins.map((w) => w.opponent)).toEqual(["Liam Myles", "Adam Walker", "Jack Gilson"])
  })

  it("sinks an undated win rather than letting it lead", () => {
    const wins = findSignificantWins(
      [bout({ opponent: "Jack Gilson", date: null }), bout({ opponent: "Brandon Lefler", date: "3/14/2026" })],
      index,
    )
    expect(wins.map((w) => w.opponent)).toEqual(["Brandon Lefler", "Jack Gilson"])
  })

  it("reads an opponent stored under the other field name", () => {
    const wins = findSignificantWins([{ opponent_name: "Adam Walker", win_loss: "W" }], index)
    expect(wins).toHaveLength(1)
  })
})

describe("nationally ranked opponents", () => {
  const withNational: OpponentIndex = {
    ...index,
    nationallyRanked: [
      { name: "Melvin Miller", rank: 1, source: "Sports Illustrated", state: "PA" },
      { name: "Adam Walker", rank: 12, source: "MatScouts", state: "NC" },
    ],
  }

  it("counts a win over an out-of-state nationally ranked wrestler", () => {
    // Most opponents worth naming will never be in our own athlete table.
    const wins = findSignificantWins([bout({ opponent: "Melvin Miller" })], withNational)
    expect(wins).toHaveLength(1)
    expect(wins[0]).toMatchObject({ reason: "national-ranked", nationalRankLabel: "#1 Sports Illustrated" })
  })

  it("ranks a national credential above the TOC field for the same opponent", () => {
    // Adam Walker is in both lists; the stronger credential should win.
    const wins = findSignificantWins([bout({ opponent: "Adam Walker" })], withNational)
    expect(wins[0]).toMatchObject({ reason: "national-ranked" })
  })

  it("leads the list with nationally ranked wins", () => {
    const wins = findSignificantWins(
      [bout({ opponent: "Liam Myles", date: "3/20/2026" }), bout({ opponent: "Melvin Miller", date: "1/2/2026" })],
      withNational,
    )
    expect(wins.map((w) => w.reason)).toEqual(["national-ranked", "toc-field"])
  })

  it("still works when no national list is supplied", () => {
    expect(findSignificantWins([bout()], index)).toHaveLength(1)
  })

  it("names nationally ranked losses too", () => {
    const losses = findSignificantLosses([bout({ opponent: "Melvin Miller", win_loss: "L" })], withNational)
    expect(losses[0]).toMatchObject({ reason: "national-ranked" })
  })
})

describe("findSignificantLosses", () => {
  it("keeps a loss to somebody in the TOC field", () => {
    const losses = findSignificantLosses([bout({ win_loss: "L" })], index)
    expect(losses).toHaveLength(1)
    expect(losses[0]).toMatchObject({ opponent: "Adam Walker", reason: "toc-field" })
  })

  it("keeps a loss to a ranked prospect", () => {
    const losses = findSignificantLosses([bout({ opponent: "Jack Gilson", win_loss: "L" })], index)
    expect(losses).toHaveLength(1)
    expect(losses[0]).toMatchObject({ reason: "ranked" })
  })

  it("ignores a loss to somebody nobody has heard of", () => {
    expect(findSignificantLosses([bout({ opponent: "Unknown Kid", win_loss: "L" })], index)).toEqual([])
  })

  it("does not report wins as losses, or losses as wins", () => {
    const bouts = [bout({ win_loss: "W" }), bout({ opponent: "Liam Myles", win_loss: "L" })]
    expect(findSignificantWins(bouts, index).map((w) => w.opponent)).toEqual(["Adam Walker"])
    expect(findSignificantLosses(bouts, index).map((w) => w.opponent)).toEqual(["Liam Myles"])
  })

  it("collapses the same loss stored twice", () => {
    const twice = [bout({ win_loss: "L" }), bout({ win_loss: "L" })]
    expect(findSignificantLosses(twice, index)).toHaveLength(1)
  })
})

describe("isLoss", () => {
  it("reads the spellings a bout row actually uses", () => {
    expect(isLoss({ win_loss: "L" })).toBe(true)
    expect(isLoss({ result: "LOSS" })).toBe(true)
    expect(isLoss({ win_loss: "W" })).toBe(false)
    expect(isLoss({ win_loss: "" })).toBe(false)
  })
})

describe("isWin", () => {
  it.each(["W", "w", "WIN", "W 5-2"])("reads %s as a win", (v) => expect(isWin({ win_loss: v })).toBe(true))
  it.each(["L", "LOSS", "", null])("does not read %s as a win", (v) => expect(isWin({ win_loss: v })).toBe(false))
})
