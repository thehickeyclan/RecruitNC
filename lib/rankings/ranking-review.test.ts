import { describe, expect, it } from "vitest"
import { reviewAthlete, reviewBoard, summariseReview, type ReviewAthlete } from "./ranking-review"

const NOW = Date.parse("2026-09-25T00:00:00Z")

const athlete = (over: Partial<ReviewAthlete> & { id: string; workingRank: number }): ReviewAthlete => ({
  name: over.id,
  formulaRank: over.workingRank,
  ...over,
})

describe("head-to-head contradictions", () => {
  /*
   * The case this was built for. Ayden Sumners sat at #10 having lost the 2026 TOC final to
   * Aidan Szewczyk at #18, and nothing on the board said so.
   */
  const order = [
    athlete({ id: "sumners", workingRank: 10, headToHead: [{ opponentId: "szewczyk", opponent: "Szewczyk", wins: 0, losses: 1 }] }),
    athlete({ id: "szewczyk", workingRank: 18, headToHead: [{ opponentId: "sumners", opponent: "Sumners", wins: 1, losses: 0 }] }),
  ]

  it("flags the wrestler ranked above somebody who beat them", () => {
    const flags = reviewAthlete(order[0]!, order, NOW)
    expect(flags.some((f) => f.kind === "beaten_by_lower")).toBe(true)
    expect(flags.find((f) => f.kind === "beaten_by_lower")!.message).toContain("Szewczyk (#18)")
  })

  it("flags the winner too, from the other side", () => {
    const flags = reviewAthlete(order[1]!, order, NOW)
    expect(flags.some((f) => f.kind === "beat_higher")).toBe(true)
  })

  it("treats beating two ranked above you as a pattern, not an afternoon", () => {
    const many = [
      athlete({ id: "a", workingRank: 5 }),
      athlete({ id: "b", workingRank: 10 }),
      athlete({
        id: "szewczyk",
        workingRank: 18,
        headToHead: [
          { opponentId: "a", opponent: "White", wins: 1, losses: 0 },
          { opponentId: "b", opponent: "Sumners", wins: 1, losses: 0 },
        ],
      }),
    ]
    const flag = reviewAthlete(many[2]!, many, NOW).find((f) => f.kind === "beat_higher")!
    expect(flag.severity).toBe("high")
  })

  it("says nothing about a meeting with somebody outside the order", () => {
    const solo = [athlete({ id: "x", workingRank: 3, headToHead: [{ opponentId: "ghost", opponent: "Ghost", wins: 0, losses: 1 }] })]
    expect(reviewAthlete(solo[0]!, solo, NOW)).toEqual([])
  })

  it("does not flag a loss to somebody ranked above them — that is the order agreeing", () => {
    const order2 = [
      athlete({ id: "top", workingRank: 2 }),
      athlete({ id: "below", workingRank: 9, headToHead: [{ opponentId: "top", opponent: "Top", wins: 0, losses: 1 }] }),
    ]
    expect(reviewAthlete(order2[1]!, order2, NOW).some((f) => f.kind === "beaten_by_lower")).toBe(false)
  })
})

describe("disagreement between models", () => {
  it("flags a wide gap to the formula and says which way", () => {
    const one = athlete({ id: "kostoff", workingRank: 3, formulaRank: 13 })
    const flag = reviewAthlete(one, [one], NOW).find((f) => f.kind === "formula_gap")!
    expect(flag.message).toContain("13")
    expect(flag.message).toContain("lower")
  })

  it("stays quiet about a difference of taste", () => {
    const one = athlete({ id: "x", workingRank: 6, formulaRank: 9 })
    expect(reviewAthlete(one, [one], NOW).some((f) => f.kind === "formula_gap")).toBe(false)
  })

  it("holds an outside service to a wider bar and reports it quietly", () => {
    const one = athlete({ id: "lopez", workingRank: 8, outsideRank: 31 })
    const flag = reviewAthlete(one, [one], NOW).find((f) => f.kind === "outside_gap")!
    expect(flag.severity).toBe("low")
  })

  it("flags a wrestler rated well below somebody ranked beneath them", () => {
    const order = [
      athlete({ id: "high", workingRank: 4, starScore: 60 }),
      athlete({ id: "low", workingRank: 20, starScore: 87 }),
    ]
    expect(reviewAthlete(order[0]!, order, NOW).some((f) => f.kind === "rating_conflict")).toBe(true)
    expect(reviewAthlete(order[1]!, order, NOW).some((f) => f.kind === "rating_conflict")).toBe(false)
  })
})

describe("what we hold about a wrestler, as opposed to how good they are", () => {
  it("calls out an empty match history as a gap, not a verdict", () => {
    const one = athlete({ id: "logan", workingRank: 25, matchCount: 0 })
    const flag = reviewAthlete(one, [one], NOW).find((f) => f.kind === "no_match_data")!
    expect(flag.severity).toBe("high")
    expect(flag.message).toContain("scores zero")
  })

  it("describes a static résumé by its age", () => {
    const one = athlete({ id: "keyshon", workingRank: 7, lastCompetedAt: "2026-03-14" })
    expect(reviewAthlete(one, [one], NOW).some((f) => f.kind === "stale")).toBe(true)
  })

  it("says nothing about a wrestler who competed this month", () => {
    const one = athlete({ id: "fresh", workingRank: 7, lastCompetedAt: "2026-09-17" })
    expect(reviewAthlete(one, [one], NOW).some((f) => f.kind === "stale")).toBe(false)
  })
})

describe("severity ordering and the summary", () => {
  it("puts the loudest flag first", () => {
    const order = [
      athlete({ id: "a", workingRank: 4, outsideRank: 40, matchCount: 0 }),
      athlete({ id: "b", workingRank: 9 }),
    ]
    const flags = reviewAthlete(order[0]!, order, NOW)
    expect(flags[0]!.severity).toBe("high")
  })

  it("counts how much of an order is contested", () => {
    const order = [
      athlete({ id: "a", workingRank: 1, matchCount: 0 }),
      athlete({ id: "b", workingRank: 2 }),
      athlete({ id: "c", workingRank: 3, formulaRank: 40 }),
    ]
    const summary = summariseReview(reviewBoard(order, NOW))
    expect(summary.contested).toBe(2)
    expect(summary.high).toBe(2)
    expect(summary.byKind.no_match_data).toBe(1)
  })

  it("reports nothing for an order nothing argues with", () => {
    const order = [athlete({ id: "a", workingRank: 1 }), athlete({ id: "b", workingRank: 2 })]
    expect(summariseReview(reviewBoard(order, NOW)).contested).toBe(0)
  })
})
