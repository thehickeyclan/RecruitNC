import { describe, expect, it } from "vitest"
import {
  buildTocAiSeedRecommendations,
  filterFargoFreestyleResults,
  latestSeasonMatchRows,
  orderByHeadToHeadThenResume,
  scoreNchsaaRowsForSeed,
} from "@/lib/toc/ai-seeding"
import type { TocFieldBoard } from "@/lib/toc/field-board"

function fakeSupabaseWithMatches(rows: unknown[]) {
  return {
    from(table: string) {
      if (table !== "matches") throw new Error(`Unexpected table: ${table}`)
      return {
        select() {
          return {
            in() {
              return Promise.resolve({ data: rows, error: null })
            },
          }
        },
      }
    },
  } as never
}

describe("buildTocAiSeedRecommendations", () => {
  it("prioritizes a top finish in a stronger classification over lesser placement depth", () => {
    const eightARunnerUp = scoreNchsaaRowsForSeed([
      { year: 2026, classification: "8A", weight_class: "157", place: 2, school: "Millbrook", wrestler_name: "Campbell Tufts" },
    ])
    const runnerUpWithLesserDepth = scoreNchsaaRowsForSeed([
      { year: 2026, classification: "6A", weight_class: "165", place: 2, school: "Union Pines", wrestler_name: "Tripp Sullivan" },
      { year: 2025, classification: "3A", weight_class: "165", place: 3, school: "Union Pines", wrestler_name: "Tripp Sullivan" },
      { year: 2024, classification: "3A", weight_class: "150", place: 6, school: "Union Pines", wrestler_name: "Tripp Sullivan" },
    ])
    expect(eightARunnerUp).toBeGreaterThan(runnerUpWithLesserDepth)
  })

  it("excludes Fargo Greco-Roman rows from seeding evidence", () => {
    expect(filterFargoFreestyleResults([
      { year: 2026, placement: "", record: "5-2", weight: "113", division: "Junior Boys Freestyle" },
      { year: 2026, placement: "", record: "2-2", weight: "113", division: "Junior Boys Greco-Roman" },
      { year: 2025, placement: "", record: "4-2", weight: "100", division: "16U" },
    ])).toEqual([
      { year: 2026, placement: "", record: "5-2", weight: "113", division: "Junior Boys Freestyle" },
      { year: 2025, placement: "", record: "4-2", weight: "100", division: "16U" },
    ])
  })

  it("uses a direct NCHSAA States head-to-head win as a pairwise seed tiebreaker", async () => {
    const board: TocFieldBoard = {
      summary: { totalConfirmed: 2, totalInvited: 0, fullBrackets: 0, partialBrackets: 1 },
      weights: [
        {
          weightClass: 149,
          maxSlots: 12,
          confirmedCount: 2,
          invitedCount: 0,
          openConfirmedSlots: 6,
          athletes: [
            {
              invitationId: "i-ammon",
              athleteId: "ammon",
              name: "Ammon Scott",
              school: "South Point",
              graduationYear: 2027,
              status: "confirmed",
              seed: null,
              jacketSize: null,
              invitedAt: null,
              confirmedAt: null,
            },
            {
              invitationId: "i-aiden",
              athleteId: "aiden",
              name: "Aiden Campbell",
              school: "Havelock",
              graduationYear: 2027,
              status: "confirmed",
              seed: null,
              jacketSize: null,
              invitedAt: null,
              confirmedAt: null,
            },
          ],
        },
      ],
    }

    const recommendations = await buildTocAiSeedRecommendations({
      supabase: fakeSupabaseWithMatches([
        {
          athlete_id: "ammon",
          total_matches: 40,
          wins: 36,
          losses: 4,
          matches: [],
        },
        {
          athlete_id: "aiden",
          total_matches: 30,
          wins: 20,
          losses: 10,
          matches: [
            {
              opponent_name: "Ammon Scott",
              win_loss: "W",
              tournament: "NCHSAA State Championships",
              weight: "149",
            },
          ],
        },
      ]),
      board,
      athleteRowsById: new Map(),
    })

    expect(recommendations.get("aiden")?.aiSeed).toBe(1)
    expect(recommendations.get("ammon")?.aiSeed).toBe(2)
    expect(recommendations.get("ammon")?.seedEvidence.headToHead).toEqual([
      { opponent: "Aiden Campbell", wins: 0, losses: 1 },
    ])
  })
})

describe("latestSeasonMatchRows", () => {
  it("keeps only the most recent season", () => {
    const rows = [
      { athlete_id: "a", season: "2024-25", wins: 40, losses: 5 },
      { athlete_id: "a", season: "2025-26", wins: 55, losses: 2 },
      { athlete_id: "a", season: "2023-24", wins: 20, losses: 12 },
    ]
    expect(latestSeasonMatchRows(rows).map((r) => r.season)).toEqual(["2025-26"])
  })

  it("keeps every row from that season when a wrestler has more than one", () => {
    const rows = [
      { athlete_id: "a", season: "2025-26", wins: 30 },
      { athlete_id: "a", season: "2025-26", wins: 12 },
      { athlete_id: "a", season: "2024-25", wins: 40 },
    ]
    expect(latestSeasonMatchRows(rows)).toHaveLength(2)
  })

  it("falls back to every row when no season is recorded", () => {
    const rows = [{ athlete_id: "a", wins: 10 }, { athlete_id: "a", wins: 4 }]
    expect(latestSeasonMatchRows(rows)).toHaveLength(2)
  })
})

describe("orderByHeadToHeadThenResume", () => {
  const wrestler = (name: string, score: number, beat: string[] = [], lostTo: string[] = []) => ({
    athlete: { athleteId: name, name },
    score,
    evidence: {
      headToHead: [
        ...beat.map((opponent) => ({ opponent, wins: 1, losses: 0 })),
        ...lostTo.map((opponent) => ({ opponent, wins: 0, losses: 1 })),
      ],
    },
  })

  const order = (rows: ReturnType<typeof wrestler>[]) =>
    orderByHeadToHeadThenResume(rows as never).map((r: { athlete: { name: string } }) => r.athlete.name)

  it("orders by résumé when nobody has met", () => {
    expect(order([wrestler("Weak", 40), wrestler("Strong", 180)])).toEqual(["Strong", "Weak"])
  })

  it("puts a direct winner above the wrestler they beat, whatever the résumés say", () => {
    // Burkholder 168 with two state titles, Walker 134, Walker won this season.
    const rows = [
      wrestler("Burkholder", 168, [], ["Walker"]),
      wrestler("Walker", 134, ["Burkholder"]),
    ]
    expect(order(rows)).toEqual(["Walker", "Burkholder"])
  })

  it("does not drag the winner above wrestlers they never met", () => {
    // Sedgwick is stronger than both and beat nobody here; he keeps the top seed.
    const rows = [
      wrestler("Sedgwick", 233),
      wrestler("Burkholder", 168, [], ["Walker"]),
      wrestler("Walker", 134, ["Burkholder"]),
    ]
    expect(order(rows)).toEqual(["Sedgwick", "Walker", "Burkholder"])
  })

  it("breaks a circular series by résumé rather than looping forever", () => {
    const rows = [
      wrestler("A", 100, ["B"], ["C"]),
      wrestler("B", 90, ["C"], ["A"]),
      wrestler("C", 80, ["A"], ["B"]),
    ]
    const result = order(rows)
    expect(result).toHaveLength(3)
    expect([...result].sort()).toEqual(["A", "B", "C"])
  })

  it("respects a chain of results within reach of each other", () => {
    const rows = [
      wrestler("Top", 200, [], ["Middle"]),
      wrestler("Middle", 160, ["Top"], ["Bottom"]),
      wrestler("Bottom", 120, ["Middle"]),
    ]
    expect(order(rows)).toEqual(["Bottom", "Middle", "Top"])
  })

  it("will not let one upset from far below invert the bracket", () => {
    // Kristopher Kerr Jr, 1-4 against the 117 field, beat Liam Myles once. Unlimited, that single
    // result put a two-time state champion with the field's second-best résumé dead last and sent
    // him into a first-round meeting with the top seed.
    const rows = [
      wrestler("Raper", 203, ["Myles", "Kerr"]),
      wrestler("Myles", 185, [], ["Raper", "Kerr"]),
      wrestler("Kerr", 112, ["Myles"], ["Raper"]),
    ]
    expect(order(rows)).toEqual(["Raper", "Myles", "Kerr"])
  })

  it("carries a win from just outside the résumé gap it is meant to cover", () => {
    // 132 against 180 is 48 apart — about one state title, the case this exists for.
    expect(order([wrestler("Better", 180, [], ["Worse"]), wrestler("Worse", 132, ["Better"])]))
      .toEqual(["Worse", "Better"])
  })
})
