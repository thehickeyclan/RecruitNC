import { describe, expect, it } from "vitest"
import { buildTocAiSeedRecommendations, filterFargoFreestyleResults } from "@/lib/toc/ai-seeding"
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
          maxSlots: 8,
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
