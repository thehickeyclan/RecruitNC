import { describe, expect, it } from "vitest"
import { findSignificantWins, isWin, type OpponentIndex } from "./significant-wins"

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

describe("isWin", () => {
  it.each(["W", "w", "WIN", "W 5-2"])("reads %s as a win", (v) => expect(isWin({ win_loss: v })).toBe(true))
  it.each(["L", "LOSS", "", null])("does not read %s as a win", (v) => expect(isWin({ win_loss: v })).toBe(false))
})
