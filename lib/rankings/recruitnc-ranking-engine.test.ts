import { describe, expect, it } from "vitest"
import { HEAD_TO_HEAD_MAX_GAP } from "@/lib/toc/ai-seeding"
import {
  buildCandidateHeadToHead,
  latestProspectMatchRows,
  isUpsetLoss,
  withinRankingWindow,
  orderProspectsByHeadToHead,
  scoreProspectMatchResume,
} from "@/lib/rankings/recruitnc-ranking-engine"

describe("RecruitNC TOC-style ranking engine", () => {
  it("uses only the latest season for candidate head-to-head evidence", () => {
    const rows = [
      { athlete_id: "a", season: "2024-25", wins: 30, losses: 5 },
      { athlete_id: "a", season: "2025-26", wins: 38, losses: 2 },
      { athlete_id: "a", season: "2025-26", wins: 6, losses: 1 },
    ]
    expect(latestProspectMatchRows(rows)).toHaveLength(2)
    expect(latestProspectMatchRows(rows).every((row) => row.season === "2025-26")).toBe(true)
  })

  it("matches the TOC quality-win, record, and résumé-depth score", () => {
    const result = scoreProspectMatchResume([
      {
        athlete_id: "a",
        total_matches: 40,
        wins: 36,
        losses: 4,
        matches: [{ opponent_name: "Top Opponent", win_loss: "W", opponent_percentage: 98 }],
      },
    ])

    // 7.9 for the single quality win (sqrt curve), 16 for a 36-4 record, 5 for depth.
    expect(result.score).toBe(28.9)
    expect(result.qualityWins).toBe(1)
  })

  /**
   * The quality-win score has to separate wrestlers, which the old ceiling did not.
   *
   * It was `Math.min(qualityWinPoints, 30)`, and thirty-four of the thirty-eight ranked
   * wrestlers in the Class of 2028 were at or above it — so the one component measuring who a
   * wrestler actually beat gave all of them the same number. Jake Amiott had 50 wins over
   * top-5% opponents and scored exactly what a wrestler with four scored.
   */
  it("keeps separating wrestlers well past the old thirty-point ceiling", () => {
    const quality = (count: number) =>
      scoreProspectMatchResume([
        {
          athlete_id: "a",
          total_matches: 40,
          wins: 36,
          losses: 4,
          matches: Array.from({ length: count }, (_, i) => ({
            opponent_name: `Opponent ${i}`,
            win_loss: "W",
            opponent_percentage: 99,
          })),
        },
      ]).score

    // Four, twenty and fifty elite wins used to be indistinguishable. They must not be.
    expect(quality(20)).toBeGreaterThan(quality(4))
    expect(quality(50)).toBeGreaterThan(quality(20))
  })

  it("grows on a curve, so a long season cannot run away with the board", () => {
    const quality = (count: number) =>
      scoreProspectMatchResume([
        {
          athlete_id: "a",
          total_matches: 60,
          wins: 60,
          losses: 0,
          matches: Array.from({ length: count }, (_, i) => ({
            opponent_name: `Opponent ${i}`,
            win_loss: "W",
            opponent_percentage: 99,
          })),
        },
      ]).score

    // Twice the elite wins is worth about forty per cent more, not twice as much.
    const ratio = (quality(40) - 23) / (quality(10) - 23)
    expect(ratio).toBeGreaterThan(1.6)
    expect(ratio).toBeLessThan(2.4)
  })

  it("deduplicates mirrored match records when building candidate head-to-head", () => {
    // Head-to-head is windowed to the last 12 months, so bouts must be dated.
    const date = new Date(Date.now() - 30 * 86_400_000).toLocaleDateString("en-US")
    const bouts = new Map([
      ["a", [{ opponent_name: "Beta Wrestler", win_loss: "W", date }]],
      ["b", [{ opponent_name: "Alpha Wrestler", win_loss: "L", date }]],
    ])
    const candidates = [
      { id: "a", name: "Alpha Wrestler" },
      { id: "b", name: "Beta Wrestler" },
    ]

    expect(buildCandidateHeadToHead(candidates[0], candidates, bouts)).toMatchObject([
      { opponentId: "b", opponent: "Beta Wrestler", wins: 1, losses: 0, lastMeetingWon: true },
    ])
  })

  it("drops a head-to-head meeting older than 12 months", () => {
    const stale = new Date(Date.now() - 400 * 86_400_000).toLocaleDateString("en-US")
    const bouts = new Map([["a", [{ opponent_name: "Beta Wrestler", win_loss: "W", date: stale }]]])
    const candidates = [
      { id: "a", name: "Alpha Wrestler" },
      { id: "b", name: "Beta Wrestler" },
    ]
    expect(buildCandidateHeadToHead(candidates[0], candidates, bouts)).toEqual([])
  })

  it("gives a split series to whoever won most recently", () => {
    const older = new Date(Date.now() - 200 * 86_400_000).toLocaleDateString("en-US")
    const recent = new Date(Date.now() - 2 * 86_400_000).toLocaleDateString("en-US")
    const bouts = new Map([
      ["a", [
        { opponent_name: "Beta Wrestler", win_loss: "L", date: older },
        { opponent_name: "Beta Wrestler", win_loss: "W", date: recent },
      ]],
    ])
    const candidates = [
      { id: "a", name: "Alpha Wrestler" },
      { id: "b", name: "Beta Wrestler" },
    ]
    expect(buildCandidateHeadToHead(candidates[0], candidates, bouts)).toMatchObject([
      { opponentId: "b", wins: 1, losses: 1, lastMeetingWon: true },
    ])
  })

  it("puts a direct winner first when the résumés are close", () => {
    const ordered = orderProspectsByHeadToHead([
      {
        id: "a",
        name: "Alpha",
        ai_score: 100,
        head_to_head: [{ opponentId: "b", opponent: "Beta", wins: 0, losses: 1 }],
      },
      {
        id: "b",
        name: "Beta",
        ai_score: 85,
        head_to_head: [{ opponentId: "a", opponent: "Alpha", wins: 1, losses: 0 }],
      },
    ])
    expect(ordered.map((row) => row.id)).toEqual(["b", "a"])
  })

  it("lets a direct win reorder wrestlers whose résumés are close", () => {
    // 25 apart, about half a state title. This used to be ignored: the reach was 20 points, and
    // one NCHSAA title scores forty-eight, so a head-to-head win never moved anybody.
    const ordered = orderProspectsByHeadToHead([
      {
        id: "a",
        name: "Alpha",
        ai_score: 110,
        head_to_head: [{ opponentId: "b", opponent: "Beta", wins: 0, losses: 1 }],
      },
      {
        id: "b",
        name: "Beta",
        ai_score: 85,
        head_to_head: [{ opponentId: "a", opponent: "Alpha", wins: 1, losses: 0 }],
      },
    ])
    expect(ordered.map((row) => row.id)).toEqual(["b", "a"])
  })

  it("does not let one win from far below invert the board", () => {
    // 130 apart is more than two state titles. Beating somebody once does not make you their
    // equal, and letting it through put a two-time state champion last at 117 in TOC seeding.
    const ordered = orderProspectsByHeadToHead([
      {
        id: "a",
        name: "Alpha",
        ai_score: 200,
        head_to_head: [{ opponentId: "b", opponent: "Beta", wins: 0, losses: 1 }],
      },
      {
        id: "b",
        name: "Beta",
        ai_score: 70,
        head_to_head: [{ opponentId: "a", opponent: "Alpha", wins: 1, losses: 0 }],
      },
    ])
    expect(ordered.map((row) => row.id)).toEqual(["a", "b"])
  })

  it("uses the same reach as TOC seeding, so the two tools cannot disagree", () => {
    expect(HEAD_TO_HEAD_MAX_GAP).toBe(50)
  })
})

describe("isUpsetLoss", () => {
  const loss = (over = {}) => ({
    reason: "ranked" as const,
    opponentRanking: 19,
    opponentGraduationYear: 2027,
    ...over,
  })

  it("flags a loss to somebody ranked below them in the same class", () => {
    expect(isUpsetLoss(loss(), 4, 2027)).toBe(true)
  })

  it("does not flag a loss to somebody ranked above them", () => {
    expect(isUpsetLoss(loss({ opponentRanking: 2 }), 4, 2027)).toBe(false)
  })

  it("never compares across graduation years — those are different fields", () => {
    expect(isUpsetLoss(loss({ opponentGraduationYear: 2026 }), 4, 2027)).toBe(false)
  })

  it("needs a published ranking on both sides", () => {
    expect(isUpsetLoss(loss({ opponentRanking: null }), 4, 2027)).toBe(false)
    expect(isUpsetLoss(loss(), null, 2027)).toBe(false)
  })

  it("ignores national and TOC-field losses, which carry no NC number to contradict", () => {
    expect(isUpsetLoss(loss({ reason: "national-ranked" }), 4, 2027)).toBe(false)
    expect(isUpsetLoss(loss({ reason: "toc-field" }), 4, 2027)).toBe(false)
  })
})

describe("withinRankingWindow", () => {
  const now = Date.parse("2026-09-08T00:00:00Z")

  it("keeps a result from this season", () => {
    expect(withinRankingWindow([{ date: "2026-02-24" }], now)).toHaveLength(1)
  })

  it("drops a result from two seasons ago", () => {
    expect(withinRankingWindow([{ date: "2024-02-24" }], now)).toHaveLength(0)
  })

  it("keeps an undated row rather than inventing a reason to drop it", () => {
    expect(withinRankingWindow([{ date: null }, {}], now)).toHaveLength(2)
  })

  it("cuts at twelve months", () => {
    expect(withinRankingWindow([{ date: "2025-09-09" }], now)).toHaveLength(1)
    expect(withinRankingWindow([{ date: "2025-09-06" }], now)).toHaveLength(0)
  })
})
