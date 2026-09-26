import { describe, expect, it } from "vitest"
import { buildPoundForPound, poundForPoundScore, seasonRecordPoints, type PoundForPoundInput } from "./pound-for-pound"

const w = (id: string, over: Partial<PoundForPoundInput> = {}): PoundForPoundInput => ({
  id, name: id, graduationYear: 2027, classRank: null, ...over,
})

describe("the current season only", () => {
  it("does not reward a wrestler for having been here longer", () => {
    /*
     * The whole reason this exists. Sorting the class boards together gave a seniority list —
     * fifteen of the top twenty from one class — because the class score accumulates across
     * seasons. Identical seasons must score identically whatever the graduation year.
     */
    const senior = w("senior", { graduationYear: 2027, statePlace: 1, wins: 40, losses: 3 })
    const sophomore = w("soph", { graduationYear: 2029, statePlace: 1, wins: 40, losses: 3 })
    expect(poundForPoundScore(senior)).toBe(poundForPoundScore(sophomore))
  })
})

describe("what a season is worth", () => {
  it("ranks a national podium above a TOC title above a state title", () => {
    expect(poundForPoundScore(w("a", { nationalPlace: 1 }))).toBeGreaterThan(poundForPoundScore(w("b", { tocPlace: 1 })))
    expect(poundForPoundScore(w("b", { tocPlace: 1 }))).toBeGreaterThan(poundForPoundScore(w("c", { statePlace: 1 })))
  })

  it("does not let a short unbeaten run out-score a long one", () => {
    expect(seasonRecordPoints(6, 0)).toBeLessThan(seasonRecordPoints(40, 2))
  })

  it("caps ranked wins so a crowded weight cannot run away with it", () => {
    expect(poundForPoundScore(w("a", { rankedWins: 20 }))).toBe(poundForPoundScore(w("b", { rankedWins: 6 })))
  })
})

describe("results override the score", () => {
  it("never places a wrestler below somebody they beat, when the seasons are within reach", () => {
    const list = buildPoundForPound(
      [w("ahead", { statePlace: 1, wins: 40, losses: 1 }), w("behind", { statePlace: 2, wins: 38, losses: 3 })],
      [{ winnerId: "behind", loserId: "ahead", date: "2026-02-21" }],
    )
    expect(list[0]!.id).toBe("behind")
  })

  it("does not let one result drag somebody past a season twice as good", () => {
    /*
     * Without a limit the override ran away: ninety wrestlers and a hundred and ninety-two
     * meetings produced an order whose scores read 97, 110, 110, 97 — chains of results dragging
     * wrestlers past people they had never met. The result is still reported, in `beatenBy`.
     */
    const list = buildPoundForPound(
      [w("strong", { statePlace: 1, nationalPlace: 2, wins: 40, losses: 1 }), w("weak", { wins: 20, losses: 10 })],
      [{ winnerId: "weak", loserId: "strong", date: "2026-02-21" }],
    )
    expect(list[0]!.id).toBe("strong")
    expect(list[0]!.beatenBy).toContain("weak")
  })

  it("lets the most recent meeting settle it", () => {
    const list = buildPoundForPound(
      [w("a", { statePlace: 1 }), w("b")],
      [
        { winnerId: "b", loserId: "a", date: "2025-11-22" },
        { winnerId: "a", loserId: "b", date: "2026-09-18" },
      ],
    )
    expect(list[0]!.id).toBe("a")
  })

  it("resolves a chain without leaving a contradiction behind", () => {
    // Moving one wrestler up can create the next contradiction, so it settles repeatedly.
    const list = buildPoundForPound(
      [w("a", { statePlace: 1 }), w("b", { tocPlace: 4 }), w("c")],
      [{ winnerId: "c", loserId: "a", date: "2026-03-01" }, { winnerId: "b", loserId: "c", date: "2026-03-02" }],
    )
    const at = (id: string) => list.findIndex((x) => x.id === id)
    expect(at("c")).toBeLessThan(at("a"))
    expect(at("b")).toBeLessThan(at("c"))
  })

  it("reports anyone below them who has beaten them", () => {
    const list = buildPoundForPound([w("a"), w("b")], [])
    expect(list.every((entry) => entry.beatenBy.length === 0)).toBe(true)
  })
})

describe("NHSCA brackets by grade, so a placement is not comparable across divisions", () => {
  it("no longer lets a freshman title outrank the junior podium", () => {
    /*
     * Braylen Yates won the Freshman bracket at 170 (5-0) and Carson Worrick took fourth in the
     * Junior bracket (7-2). Scored as equal placements, a ninth-grader topped a state-wide list.
     */
    const freshmanChamp = poundForPoundScore(w("yates", { nationalPlace: 1, nationalDivision: "Freshman" }))
    const juniorFourth = poundForPoundScore(w("worrick", { nationalPlace: 4, nationalDivision: "Junior" }))
    const juniorChamp = poundForPoundScore(w("x", { nationalPlace: 1, nationalDivision: "Junior" }))
    expect(freshmanChamp).toBeLessThan(juniorChamp)
    expect(freshmanChamp).toBeGreaterThan(juniorFourth)
  })

  it("still counts a freshman national title as a serious result", () => {
    // Gentle on purpose: winning a national bracket is winning a national bracket.
    expect(poundForPoundScore(w("a", { nationalPlace: 1, nationalDivision: "Freshman" })))
      .toBeGreaterThan(poundForPoundScore(w("b", { statePlace: 1 })))
  })

  it("leaves an open tournament alone", () => {
    // Fargo and Super 32 do not bracket by grade, so nothing is discounted.
    expect(poundForPoundScore(w("a", { nationalPlace: 1 })))
      .toBe(poundForPoundScore(w("b", { nationalPlace: 1, nationalDivision: null })))
  })
})
