import { describe, expect, it } from "vitest"
import { applyTocSeedOrder, buildTocFieldBoard } from "@/lib/toc/field-board"
import { buildTocSeedChartText, buildTocWeightRosterCsv } from "@/lib/toc/bracket-export"

describe("buildTocFieldBoard", () => {
  it("groups invitations by weight and counts confirmed slots", () => {
    const board = buildTocFieldBoard([
      {
        id: "1",
        athlete_id: "a1",
        weight_class: 174,
        status: "confirmed",
        seed: 1,
        jacket_size: "AL",
        invited_at: "2026-01-01",
        confirmed_at: "2026-01-02",
        athletes: { id: "a1", name: "Tobin McNair", highschool: "Cardinal Gibbons", graduationyear: 2027 },
      },
      {
        id: "2",
        athlete_id: "a2",
        weight_class: 174,
        status: "invited",
        seed: null,
        jacket_size: null,
        invited_at: "2026-01-03",
        confirmed_at: null,
        athletes: { id: "a2", name: "Alex Smith", highschool: "Wake Forest", graduationyear: 2026 },
      },
    ])

    const w174 = board.weights.find((w) => w.weightClass === 174)
    expect(w174?.confirmedCount).toBe(1)
    expect(w174?.invitedCount).toBe(1)
    expect(w174?.openConfirmedSlots).toBe(11)
    expect(board.summary.totalConfirmed).toBe(1)
    expect(board.summary.totalInvited).toBe(1)
  })

  it("applies an optimistic seed order without rebuilding the field", () => {
    const invitations = [1, 2, 3].map((seed) => ({
      id: `00000000-0000-4000-8000-00000000000${seed}`,
      athlete_id: `a${seed}`,
      weight_class: 149,
      status: "confirmed" as const,
      seed,
      jacket_size: null,
      invited_at: null,
      confirmed_at: null,
      athletes: { id: `a${seed}`, name: `Wrestler ${seed}`, highschool: "HS", graduationyear: 2027 },
    }))
    const board = buildTocFieldBoard(invitations)
    const reordered = applyTocSeedOrder(board, 149, [invitations[2].id, invitations[0].id, invitations[1].id])
    const athletes = reordered.weights.find((weight) => weight.weightClass === 149)!.athletes

    expect(athletes.map((athlete) => [athlete.name, athlete.seed])).toEqual([
      ["Wrestler 3", 1],
      ["Wrestler 1", 2],
      ["Wrestler 2", 3],
    ])
  })
})

describe("bracket export", () => {
  it("exports confirmed roster CSV with seeds", () => {
    const board = buildTocFieldBoard([
      {
        id: "1",
        athlete_id: "a1",
        weight_class: 157,
        status: "confirmed",
        seed: 2,
        jacket_size: null,
        invited_at: null,
        confirmed_at: null,
        athletes: { id: "a1", name: "Jane Doe", highschool: "School A", graduationyear: 2027 },
      },
    ]).weights.find((w) => w.weightClass === 157)!

    const csv = buildTocWeightRosterCsv(board)
    expect(csv).toContain("157")
    expect(csv).toContain("Doe")
    expect(csv).toContain("Jane")
    expect(csv).toContain("2")
  })

  it("builds round 1 pairings when eight seeds are set", () => {
    const athletes = [1, 2, 3, 4, 5, 6, 7, 8].map((seed, i) => ({
      id: String(i),
      athlete_id: `a${i}`,
      weight_class: 133,
      status: "confirmed" as const,
      seed,
      jacket_size: null,
      invited_at: null,
      confirmed_at: null,
      athletes: { id: `a${i}`, name: `Wrestler ${seed}`, highschool: "HS", graduationyear: 2027 },
    }))

    const board = buildTocFieldBoard(athletes).weights.find((w) => w.weightClass === 133)!
    const chart = buildTocSeedChartText(board)
    expect(chart).toContain("Match 1")
    expect(chart).toContain("(#1) Wrestler 1 vs (#8) Wrestler 8")
    expect(chart).toContain("(#4) Wrestler 4 vs (#5) Wrestler 5")
    expect(chart).toContain("(#3) Wrestler 3 vs (#6) Wrestler 6")
    expect(chart).toContain("(#7) Wrestler 7 vs (#2) Wrestler 2")
  })
})
