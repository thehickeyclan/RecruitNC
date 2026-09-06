import { describe, expect, it } from "vitest"
import { HEAD_TO_HEAD_MAX_GAP } from "@/lib/toc/ai-seeding"
import {
  buildCandidateHeadToHead,
  latestProspectMatchRows,
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

    expect(result.score).toBe(29)
    expect(result.qualityWins).toBe(1)
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
