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

describe("the two lists never contradict each other", () => {
  it("never places a wrestler above a classmate the class board ranks above them", () => {
    /*
     * The failure this prevents, from the real board: the Class of 2027 has Tobin McNair 2nd and
     * Gavin Lopez 6th; scoring the season alone put Lopez 2nd on this list and McNair 3rd. A
     * reader opening both on the same afternoon sees us disagreeing with ourselves.
     */
    const list = buildPoundForPound([
      w("lopez", { classRank: 6, statePlace: 1, tocPlace: 1, nationalPlace: 4, wins: 45, losses: 0 }),
      w("mcnair", { classRank: 2, statePlace: 1, tocPlace: 1, nationalPlace: 5, wins: 43, losses: 0 }),
    ])
    const at = (id: string) => list.findIndex((x) => x.id === id)
    expect(at("mcnair")).toBeLessThan(at("lopez"))
  })

  it("still lets a lower-ranked wrestler from another class finish above them", () => {
    // The cross-class question is the one this list exists to answer, so it must survive.
    const list = buildPoundForPound([
      w("senior", { graduationYear: 2027, classRank: 1, statePlace: 3, wins: 30, losses: 6 }),
      w("soph", { graduationYear: 2029, classRank: 4, statePlace: 1, nationalPlace: 1, wins: 40, losses: 1 }),
    ])
    expect(list[0]!.id).toBe("soph")
  })

  it("sorts a wrestler with no class rank below their ranked classmates", () => {
    const list = buildPoundForPound([
      w("unranked", { classRank: null, statePlace: 1, tocPlace: 1, wins: 40, losses: 0 }),
      w("ranked", { classRank: 9, wins: 10, losses: 9 }),
    ])
    expect(list[0]!.id).toBe("ranked")
  })
})

describe("when the class board disagrees with the season", () => {
  it("keeps the season standing so the page can show what the board moved", () => {
    /*
     * Josh Stonebraker's real case: state title, TOC title, 42-1 - the fourth best season in the
     * state - and the 2027 board has him 15th. Enforcing the board is right; doing it without
     * leaving a trace is what made the list look broken to anyone reading the score column.
     */
    const list = buildPoundForPound([
      w("best", { classRank: 1, statePlace: 1, tocPlace: 1, nationalPlace: 4, wins: 45, losses: 0 }),
      w("thin", { classRank: 2, wins: 36, losses: 0 }),
      w("strong", { classRank: 3, statePlace: 1, tocPlace: 1, wins: 42, losses: 1 }),
    ])
    const by = (id: string) => list.find((x) => x.id === id)!
    // The board order is obeyed exactly.
    expect(list.map((x) => x.id)).toEqual(["best", "thin", "strong"])
    // But the season said otherwise, and both numbers survive.
    expect(by("strong").scoreRank).toBe(2)
    expect(by("strong").classOverride).toBe(1)
    expect(by("thin").scoreRank).toBe(3)
    expect(by("thin").classOverride).toBe(-1)
  })

  it("reports no override when the two agree", () => {
    const list = buildPoundForPound([
      w("first", { classRank: 1, statePlace: 1, tocPlace: 1, wins: 40, losses: 0 }),
      w("second", { classRank: 2, statePlace: 2, wins: 30, losses: 5 }),
    ])
    expect(list.every((x) => x.classOverride === 0)).toBe(true)
  })
})

describe("a result contradicts any order, in any class", () => {
  it("reports everyone who beat them, whatever their class or position", () => {
    /*
     * Micah Howard (2027) beat Jacob Perry (2028) in the TOC semi-final. The page could move
     * Perry above Howard with nothing turning red, because the only rule it could check was
     * about classmates and these two graduate in different years. `beatenBy` was no help: it is
     * names, already filtered against the order this build produced, so it says nothing about
     * an order somebody makes by hand afterwards.
     */
    const list = buildPoundForPound(
      [
        w("howard", { graduationYear: 2027, classRank: 20, statePlace: 1, tocPlace: 2, wins: 52, losses: 2 }),
        w("perry", { graduationYear: 2028, classRank: 9, statePlace: 4, tocPlace: 3, wins: 61, losses: 8 }),
      ],
      [{ winnerId: "howard", loserId: "perry", date: "2026-09-18", event: "Tournament of Champions" }],
    )
    const perry = list.find((x) => x.id === "perry")!
    const howard = list.find((x) => x.id === "howard")!
    expect(perry.lostTo).toContain("howard")
    expect(howard.lostTo).not.toContain("perry")
  })

  it("keeps reporting a loss even when the winner is ranked above them", () => {
    // beatenBy hides this case by design; lostTo must not, or a hand edit cannot be checked.
    const list = buildPoundForPound(
      [
        w("strong", { classRank: 1, statePlace: 1, nationalPlace: 1, wins: 40, losses: 1 }),
        w("weak", { classRank: 2, wins: 20, losses: 10 }),
      ],
      [{ winnerId: "strong", loserId: "weak", date: "2026-02-21" }],
    )
    const weak = list.find((x) => x.id === "weak")!
    expect(weak.beatenBy).toEqual([])
    expect(weak.lostTo).toContain("strong")
  })
})
