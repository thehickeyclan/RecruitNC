import { describe, expect, it } from "vitest"
import { RANKED_WIN_CAP, rankedWinValue, scoreRankedWins } from "./ranked-win-value"

const win = (reason: "national-ranked" | "toc-field" | "ranked", opponentRanking: number | null = null) =>
  ({ reason, opponentRanking })

describe("rankedWinValue", () => {
  it("does not let the TOC field hide a ranking", () => {
    // Kostoff beat Jake Amiott, the #2 in the Class of 2028, at the TOC. He also beat Cayden
    // Laws there, who went 0-2. The old scorer paid 10 for each.
    expect(rankedWinValue(win("toc-field", 2))).toBe(16)
    expect(rankedWinValue(win("toc-field", null))).toBe(9)
    expect(rankedWinValue(win("toc-field", 2))).toBeGreaterThan(rankedWinValue(win("toc-field", null)))
  })

  it("grades by how good the opponent is", () => {
    expect(rankedWinValue(win("ranked", 1))).toBe(16)
    expect(rankedWinValue(win("ranked", 8))).toBe(13)
    expect(rankedWinValue(win("ranked", 19))).toBe(10)
    expect(rankedWinValue(win("ranked", 55))).toBe(8)
  })

  it("keeps a nationally ranked win above every domestic one", () => {
    expect(rankedWinValue(win("national-ranked"))).toBe(18)
    expect(rankedWinValue(win("national-ranked"))).toBeGreaterThan(rankedWinValue(win("ranked", 1)))
  })

  it("grades across graduation years, because a tournament seeds by weight", () => {
    // The #2 of the class below is scored as the #2, not discounted for being a year younger.
    expect(rankedWinValue(win("toc-field", 2))).toBe(rankedWinValue(win("ranked", 2)))
  })

  it("falls back when a ranking cannot be resolved", () => {
    expect(rankedWinValue(win("ranked", null))).toBe(7)
    expect(rankedWinValue(win("ranked", 0))).toBe(7)
  })
})

describe("scoreRankedWins", () => {
  it("caps a long win column", () => {
    const many = Array.from({ length: 12 }, () => win("national-ranked"))
    expect(scoreRankedWins(many)).toBe(RANKED_WIN_CAP)
  })

  it("rewards the better win set when neither is capped", () => {
    const elite = [win("toc-field", 2), win("toc-field", 3), win("ranked", 5)]
    const padded = [win("toc-field", null), win("toc-field", null), win("ranked", 44)]
    expect(scoreRankedWins(elite)).toBeGreaterThan(scoreRankedWins(padded))
  })
})

describe("a TOC invitee who is also ranked", () => {
  it("is priced on the ranking, not on the invitation", () => {
    /*
     * The bug this guards. `resolveOpponent` used to null out `ranked` whenever the opponent was
     * in the TOC field, so Kostoff's win over Jake Amiott (2028 #2) and Allman's over Aaron
     * Ellison (2028 #1) both arrived here with no ranking and scored as unranked invitees.
     */
    expect(rankedWinValue({ reason: "toc-field", opponentRanking: 1 })).toBe(16)
    expect(rankedWinValue({ reason: "toc-field", opponentRanking: 2 })).toBe(16)
    expect(rankedWinValue({ reason: "toc-field", opponentRanking: null })).toBe(9)
  })
})
