import { describe, expect, it } from "vitest"
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
    const bouts = new Map([
      ["a", [{ opponent_name: "Beta Wrestler", win_loss: "W" }]],
      ["b", [{ opponent_name: "Alpha Wrestler", win_loss: "L" }]],
    ])
    const candidates = [
      { id: "a", name: "Alpha Wrestler" },
      { id: "b", name: "Beta Wrestler" },
    ]

    expect(buildCandidateHeadToHead(candidates[0], candidates, bouts)).toEqual([
      { opponentId: "b", opponent: "Beta Wrestler", wins: 1, losses: 0 },
    ])
  })

  it("puts a direct winner first when résumés are within one placement tier", () => {
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

  it("does not let one direct win erase a materially stronger résumé", () => {
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
    expect(ordered.map((row) => row.id)).toEqual(["a", "b"])
  })
})
