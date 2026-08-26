import { describe, expect, it } from "vitest"
import { rankStandings, type StandingInput } from "./pool-ranking"

const entrant = (
  name: string,
  points: number,
  correct = 0,
  methodsCorrect = 0,
  scoreError = 0,
): StandingInput => ({
  name,
  points,
  correct,
  weightsEntered: 1,
  tiebreak: { methodsCorrect, scoreError },
})

describe("rankStandings", () => {
  it("puts the most points first", () => {
    const r = rankStandings([entrant("Low", 4), entrant("High", 12)])
    expect(r.map((x) => x.name)).toEqual(["High", "Low"])
    expect(r.map((x) => x.rank)).toEqual([1, 2])
  })

  it("separates level points on correct picks", () => {
    const r = rankStandings([entrant("Volume", 10, 8), entrant("Late", 10, 4)])
    expect(r[0].name).toBe("Volume")
  })

  it("falls to the finals tiebreaker when points and correct picks are level", () => {
    const r = rankStandings([
      entrant("CalledNothing", 10, 5, 0, 0),
      entrant("CalledTwo", 10, 5, 2, 9),
    ])
    expect(r[0].name).toBe("CalledTwo")
    expect(r[0].rank).toBe(1)
    expect(r[1].rank).toBe(2)
  })

  it("separates equal called finals on how close the scores were", () => {
    const r = rankStandings([entrant("Far", 10, 5, 2, 8), entrant("Close", 10, 5, 2, 1)])
    expect(r[0].name).toBe("Close")
  })

  it("shares a rank when nothing separates two entrants", () => {
    const r = rankStandings([entrant("Bernthal", 10, 5, 1, 2), entrant("Akins", 10, 5, 1, 2)])
    expect(r.map((x) => x.rank)).toEqual([1, 1])
    // Alphabetical only so the order is stable between reloads, not because it breaks the tie.
    expect(r.map((x) => x.name)).toEqual(["Akins", "Bernthal"])
  })

  it("gives the next rank after a tie the number that reflects the tie", () => {
    const r = rankStandings([
      entrant("A", 10, 5, 1, 2),
      entrant("B", 10, 5, 1, 2),
      entrant("C", 4),
    ])
    expect(r.map((x) => x.rank)).toEqual([1, 1, 3])
  })

  it("reports how many finals each entrant called", () => {
    expect(rankStandings([entrant("Caller", 10, 5, 3, 4)])[0].finalsCalled).toBe(3)
  })
})
