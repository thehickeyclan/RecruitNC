import { describe, expect, it } from "vitest"
import { resolveEditionClassYear, resolveRankBasis } from "@/lib/rankings/national-import"
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
  editionClassYear: 0,
  rankBasis: "weight",
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

describe("a board per recruiting class", () => {
  const board = (over: Partial<NationalRanking>) =>
    row({ source: "matscouts", sourceLabel: "MatScouts", scope: "big_board", rankingMonth: "2026-10-01", ...over })

  it("names the class a board covers, so two boards are not one ranking", () => {
    // MatScouts published a senior and a junior girls board on the same day. Without the class in
    // the label, both read as "MatScouts Big Board" and a reader cannot tell which list she is on.
    expect(rankingScopeLabel({ scope: "big_board", weightClass: "155", editionClassYear: 2027, rankBasis: "weight" })).toBe(
      " Class of 2027 Big Board (155)",
    )
    expect(rankingScopeLabel({ scope: "big_board", weightClass: "170", editionClassYear: 2028, rankBasis: "overall" })).toBe(
      " Class of 2028 Big Board",
    )
  })

  it("drops the weight when the ranks are one list, because it would invent a claim", () => {
    // #55 of every junior in the country is not #55 at 170.
    const label = rankingScopeLabel({ scope: "big_board", weightClass: "170", editionClassYear: 2028, rankBasis: "overall" })
    expect(label).not.toContain("170")
  })

  it("keeps the weight when ranks restart inside each group, because the number needs it", () => {
    expect(rankingScopeLabel({ scope: "big_board", weightClass: "155", editionClassYear: 2027, rankBasis: "weight" })).toContain("(155)")
  })

  it("does not merge two boards from one outlet into a single climb", () => {
    /*
     * The senior and junior boards share source, scope and month. Grouped on those alone, a
     * wrestler listed on both would read as one series - and #17 on one board beside #3 on
     * another would be reported as a 14-place rise that never happened.
     */
    const series = nationalRankingHistory([
      board({ editionClassYear: 2027, rank: 17, weightClass: "135" }),
      board({ editionClassYear: 2028, rank: 3, weightClass: "135" }),
    ])
    expect(series).toHaveLength(2)
    expect(series.map((s) => s.movement)).toEqual([null, null])
    expect(series.map((s) => s.sourceLabel)).toEqual([
      "MatScouts Class of 2028 Big Board (135)",
      "MatScouts Class of 2027 Big Board (135)",
    ])
  })
})

describe("what an edition is", () => {
  const rows = (specs: Array<{ rank: number; weight?: string; grade?: string }>) =>
    specs.map((s) => ({ rank: s.rank, name: `W${s.rank}${s.weight ?? ""}`, weight: s.weight ?? null, grade: s.grade ?? "SR" }))
  const oct = new Date("2026-10-06T12:00:00Z")

  it("reads a board's class off its rows when every wrestler shares one", () => {
    expect(resolveEditionClassYear("big_board", null, rows([{ rank: 1, grade: "JR" }, { rank: 2, grade: "JR" }]), oct)).toBe(2028)
  })

  it("prefers the stated class over the rows", () => {
    expect(resolveEditionClassYear("big_board", 2028, rows([{ rank: 1, grade: "SR" }]), oct)).toBe(2028)
  })

  it("refuses a board that cannot say which class it covers", () => {
    // Silently filing it as class 0 would make it the same edition as every other unlabelled
    // board, and importing one would delete the other.
    expect(() => resolveEditionClassYear("big_board", null, rows([{ rank: 1, grade: "SR" }, { rank: 2, grade: "JR" }]), oct)).toThrow(
      /2 classes/,
    )
  })

  it("leaves lists that rank every class at once unscoped", () => {
    expect(resolveEditionClassYear("weight", null, rows([{ rank: 1, grade: "JR" }]), oct)).toBe(0)
    expect(resolveEditionClassYear("p4p", 2028, rows([{ rank: 1 }]), oct)).toBe(0)
  })

  it("works out that repeated ranks can only count within a weight group", () => {
    const senior = rows([
      { rank: 1, weight: "125" },
      { rank: 3, weight: "125" },
      { rank: 1, weight: "155" },
      { rank: 8, weight: "155" },
    ])
    expect(resolveRankBasis("big_board", senior)).toBe("weight")
  })

  it("works out that ranks unique across the edition are one list", () => {
    const junior = rows([
      { rank: 55, weight: "170" },
      { rank: 67, weight: "190" },
      { rank: 1, weight: "125" },
    ])
    expect(resolveRankBasis("big_board", junior)).toBe("overall")
  })

  it("never treats a weight list's ranks as one list, however they look", () => {
    expect(resolveRankBasis("weight", rows([{ rank: 1, weight: "125" }, { rank: 2, weight: "132" }]))).toBe("weight")
  })
})
