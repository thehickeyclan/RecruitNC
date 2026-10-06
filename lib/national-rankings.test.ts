import { describe, expect, it } from "vitest"
import {
  editionsSpanned,
  nationalRankingHistory,
  rankingScopeLabel,
  type NationalRanking,
} from "@/lib/national-rankings"

const row = (over: Partial<NationalRanking>): NationalRanking => ({
  source: "sports_illustrated",
  sourceLabel: "Sports Illustrated",
  rankingMonth: "2026-09-01",
  rank: 12,
  scope: "weight",
  weightClass: "132",
  classYear: 2027,
  sourceUrl: null,
  ...over,
})

describe("nationalRankingHistory", () => {
  it("keeps outlets apart rather than averaging them", () => {
    // Flo at #8 and MatScouts at #24 is a disagreement a coach should see, not a #16 we made up.
    const series = nationalRankingHistory([
      row({ source: "matscouts", sourceLabel: "MatScouts", rank: 24 }),
      row({ source: "flowrestling", sourceLabel: "FloWrestling", rank: 8 }),
    ])
    expect(series.map((s) => s.sourceLabel)).toEqual(["FloWrestling", "MatScouts"])
    expect(series.map((s) => s.current)).toEqual([8, 24])
  })

  it("orders editions newest first and reads the current rank off the newest", () => {
    const [series] = nationalRankingHistory([
      row({ rankingMonth: "2026-07-01", rank: 30 }),
      row({ rankingMonth: "2026-09-01", rank: 12 }),
      row({ rankingMonth: "2026-08-01", rank: 19 }),
    ])
    expect(series!.editions.map((e) => e.rankingMonth)).toEqual([
      "2026-09-01",
      "2026-08-01",
      "2026-07-01",
    ])
    expect(series!.current).toBe(12)
  })

  it("counts a climb as positive, because ranks run downward", () => {
    const [series] = nationalRankingHistory([
      row({ rankingMonth: "2026-07-01", rank: 30 }),
      row({ rankingMonth: "2026-09-01", rank: 12 }),
    ])
    expect(series!.movement).toBe(18)
  })

  it("counts a slide as negative", () => {
    const [series] = nationalRankingHistory([
      row({ rankingMonth: "2026-07-01", rank: 5 }),
      row({ rankingMonth: "2026-09-01", rank: 11 }),
    ])
    expect(series!.movement).toBe(-6)
  })

  it("reports no movement at all from a single edition", () => {
    // Only September is loaded today. Zero would read as "went nowhere", which is a claim.
    const [series] = nationalRankingHistory([row({})])
    expect(series!.movement).toBeNull()
  })

  it("is empty for an unranked athlete", () => {
    expect(nationalRankingHistory([])).toEqual([])
  })
})

describe("editionsSpanned", () => {
  it("counts distinct months, not rows", () => {
    expect(
      editionsSpanned([
        row({ source: "flowrestling", rankingMonth: "2026-09-01" }),
        row({ source: "matscouts", rankingMonth: "2026-09-01" }),
        row({ rankingMonth: "2026-08-01" }),
      ]),
    ).toBe(2)
  })
})

describe("rankingScopeLabel", () => {
  it("carries the weight on a big board, where ranks restart per group", () => {
    // MatScouts' 2027 girls board holds fifteen wrestlers ranked #1, one per weight.
    expect(rankingScopeLabel({ scope: "big_board", weightClass: "135" })).toBe(" Big Board (135)")
  })

  it("says Big Board without a weight rather than inventing one", () => {
    expect(rankingScopeLabel({ scope: "big_board", weightClass: null })).toBe(" Big Board")
  })

  it("labels pound-for-pound but adds no weight, because that list is one list", () => {
    expect(rankingScopeLabel({ scope: "p4p", weightClass: "132" })).toBe(" P4P")
  })

  it("adds nothing to a weight ranking, which names its weight elsewhere", () => {
    expect(rankingScopeLabel({ scope: "weight", weightClass: "132" })).toBe("")
  })
})

describe("nationalRankingHistory across list types", () => {
  const row = (over: Partial<NationalRanking>): NationalRanking => ({
    source: "matscouts",
    sourceLabel: "MatScouts",
    rankingMonth: "2026-10-01",
    rank: 1,
    scope: "weight",
    weightClass: "132",
    classYear: 2027,
    sourceUrl: null,
    ...over,
  })

  it("keeps a big board and a weight list apart", () => {
    const series = nationalRankingHistory([
      row({ scope: "weight", rank: 40, weightClass: "132" }),
      row({ scope: "big_board", rank: 1, weightClass: "125" }),
    ])
    // Merging them read as one wrestler climbing 39 places between two unrelated lists.
    expect(series).toHaveLength(2)
    expect(series.map((s) => s.sourceLabel).sort()).toEqual(["MatScouts", "MatScouts Big Board (125)"])
    expect(series.every((s) => s.movement === null)).toBe(true)
  })

  it("still tracks movement within one list type", () => {
    const series = nationalRankingHistory([
      row({ scope: "big_board", rank: 5, weightClass: "125", rankingMonth: "2026-10-01" }),
      row({ scope: "big_board", rank: 9, weightClass: "125", rankingMonth: "2026-09-01" }),
    ])
    expect(series).toHaveLength(1)
    expect(series[0]!.current).toBe(5)
    expect(series[0]!.movement).toBe(4)
  })
})
