import { describe, expect, it } from "vitest"
import { buildEightManDeDraw, roundOneBouts, validateBracketParticipants, validatePartialBracketPublish } from "@/lib/toc/eight-man-de-bracket"
import { tocDrawToConsolationBracketTree, tocDrawToWinnersBracketTree } from "@/lib/toc/to-bracket-display"
import type { TocBracketParticipant } from "@/lib/toc/bracket-types"

function mockParticipants(): TocBracketParticipant[] {
  return [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => ({
    athleteId: `athlete-${seed}`,
    invitationId: `inv-${seed}`,
    seed,
    name: `Wrestler ${seed}`,
    school: "Test HS",
    photoUrl: null,
    graduationYear: 2027,
  }))
}

describe("eight-man DE bracket", () => {
  it("requires at least eight uniquely seeded wrestlers for a complete draw", () => {
    const partial = mockParticipants().slice(0, 7)
    expect(validateBracketParticipants(partial)).toContain("between 8 and 12")
  })

  it("builds round 1 with standard seed pairings (#1 top, #2 bottom bookends)", () => {
    const draw = buildEightManDeDraw(174, mockParticipants(), new Date().toISOString())
    const r1 = roundOneBouts(draw)
    expect(r1).toHaveLength(4)
    expect(r1.map((b) => b.boutNumber)).toEqual([1, 2, 3, 4])
    expect(r1[0].top).toEqual({ kind: "athlete", athleteId: "athlete-1" })
    expect(r1[0].bottom).toEqual({ kind: "athlete", athleteId: "athlete-8" })
    expect(r1[1].top).toEqual({ kind: "athlete", athleteId: "athlete-4" })
    expect(r1[1].bottom).toEqual({ kind: "athlete", athleteId: "athlete-5" })
    expect(r1[2].top).toEqual({ kind: "athlete", athleteId: "athlete-3" })
    expect(r1[2].bottom).toEqual({ kind: "athlete", athleteId: "athlete-6" })
    expect(r1[3].top).toEqual({ kind: "athlete", athleteId: "athlete-7" })
    expect(r1[3].bottom).toEqual({ kind: "athlete", athleteId: "athlete-2" })
    expect(draw.bouts).toHaveLength(12)
    expect(draw.isComplete).toBe(true)
  })

  it("uses the standard 12-bout consolation and third-place flow", () => {
    const draw = buildEightManDeDraw(174, mockParticipants(), new Date().toISOString())
    const bout = (number: number) => draw.bouts.find((item) => item.boutNumber === number)

    expect(bout(5)?.top).toEqual({ kind: "feeder", boutNumber: 1, label: "Loser Bout 1" })
    expect(bout(5)?.bottom).toEqual({ kind: "feeder", boutNumber: 2, label: "Loser Bout 2" })
    expect(bout(6)?.top).toEqual({ kind: "feeder", boutNumber: 3, label: "Loser Bout 3" })
    expect(bout(6)?.bottom).toEqual({ kind: "feeder", boutNumber: 4, label: "Loser Bout 4" })
    expect(bout(9)?.top).toEqual({ kind: "feeder", boutNumber: 8, label: "Loser Bout 8" })
    expect(bout(9)?.bottom).toEqual({ kind: "feeder", boutNumber: 5, label: "Winner Bout 5" })
    expect(bout(10)?.top).toEqual({ kind: "feeder", boutNumber: 6, label: "Winner Bout 6" })
    expect(bout(10)?.bottom).toEqual({ kind: "feeder", boutNumber: 7, label: "Loser Bout 7" })
    expect(bout(12)?.top).toEqual({ kind: "feeder", boutNumber: 9, label: "Winner Bout 9" })
    expect(bout(12)?.bottom).toEqual({ kind: "feeder", boutNumber: 10, label: "Winner Bout 10" })
  })

  it("builds partial draw with open spots for missing seeds", () => {
    const partial = [mockParticipants()[0]]
    expect(validatePartialBracketPublish(partial)).toBeNull()
    const draw = buildEightManDeDraw(174, partial, new Date().toISOString())
    expect(draw.isComplete).toBe(false)
    expect(draw.confirmedCount).toBe(1)
    expect(draw.openSpots).toBe(7)
    expect(draw.participants).toHaveLength(8)
    expect(draw.participants[0].name).toBe("Wrestler 1")
    expect(draw.participants[1].name).toBe("Open spot")
    const r1 = roundOneBouts(draw)
    expect(r1[0].top.kind).toBe("athlete")
    expect(r1[0].bottom.kind).toBe("empty")
  })

  it("expands only 9–12 wrestler fields to a 16-slot draw with full consolation routing", () => {
    const expanded = Array.from({ length: 12 }, (_, index) => ({
      athleteId: `expanded-${index + 1}`,
      invitationId: `expanded-inv-${index + 1}`,
      seed: index + 1,
      name: `Expanded Wrestler ${index + 1}`,
      school: "Test HS",
      photoUrl: null,
      graduationYear: 2027,
    }))
    const draw = buildEightManDeDraw(149, expanded, new Date().toISOString())
    const bout = (number: number) => draw.bouts.find((item) => item.boutNumber === number)

    expect(draw.format).toBe("16-slot-de")
    expect(draw.bracketSize).toBe(16)
    expect(draw.participants).toHaveLength(16)
    expect(draw.confirmedCount).toBe(12)
    expect(draw.openSpots).toBe(0)
    expect(draw.bouts).toHaveLength(28)
    expect(draw.bouts.slice(0, 8).map((openingBout) => [openingBout.top, openingBout.bottom])).toEqual([
      [{ kind: "athlete", athleteId: "expanded-1" }, { kind: "empty", label: "Seed 16 · Bye" }],
      [{ kind: "athlete", athleteId: "expanded-9" }, { kind: "athlete", athleteId: "expanded-8" }],
      [{ kind: "athlete", athleteId: "expanded-5" }, { kind: "athlete", athleteId: "expanded-12" }],
      [{ kind: "empty", label: "Seed 13 · Bye" }, { kind: "athlete", athleteId: "expanded-4" }],
      [{ kind: "athlete", athleteId: "expanded-3" }, { kind: "empty", label: "Seed 14 · Bye" }],
      [{ kind: "athlete", athleteId: "expanded-6" }, { kind: "athlete", athleteId: "expanded-11" }],
      [{ kind: "athlete", athleteId: "expanded-7" }, { kind: "athlete", athleteId: "expanded-10" }],
      [{ kind: "empty", label: "Seed 15 · Bye" }, { kind: "athlete", athleteId: "expanded-2" }],
    ])
    expect(bout(20)?.top).toEqual({ kind: "feeder", boutNumber: 9, label: "Loser Bout 9" })
    expect(bout(20)?.bottom).toEqual({ kind: "feeder", boutNumber: 17, label: "Winner Bout 17" })
    expect(bout(28)?.top).toEqual({ kind: "feeder", boutNumber: 26, label: "Winner Bout 26" })
    expect(bout(28)?.bottom).toEqual({ kind: "feeder", boutNumber: 27, label: "Winner Bout 27" })
    expect(tocDrawToWinnersBracketTree(draw).rounds.map((round) => round.length)).toEqual([8, 4, 2, 1])
    expect(tocDrawToConsolationBracketTree(draw)?.rounds.map((round) => round.length)).toEqual([4, 4, 2, 2, 1])
  })

  it("crosses 16-slot consolation feeders without creating immediate rematches", () => {
    const expanded = Array.from({ length: 12 }, (_, index) => ({
      athleteId: `seed-${index + 1}`,
      invitationId: `seed-inv-${index + 1}`,
      seed: index + 1,
      name: `Seed ${index + 1}`,
      school: "Test HS",
      photoUrl: null,
      graduationYear: 2027,
    }))
    const bouts = buildEightManDeDraw(149, expanded, new Date().toISOString()).bouts
    const feederNumbers = (number: number) => {
      const target = bouts.find((item) => item.boutNumber === number)!
      return [target.top, target.bottom].map((slot) => slot.kind === "feeder" ? slot.boutNumber : null)
    }

    expect(feederNumbers(16)).toEqual([1, 2])
    expect(feederNumbers(17)).toEqual([3, 4])
    expect(feederNumbers(18)).toEqual([5, 6])
    expect(feederNumbers(19)).toEqual([7, 8])
    // Quarterfinal losers cross into the opposite opening consolation bout.
    expect(feederNumbers(20)).toEqual([9, 17])
    expect(feederNumbers(21)).toEqual([10, 16])
    expect(feederNumbers(22)).toEqual([11, 19])
    expect(feederNumbers(23)).toEqual([12, 18])
    // Semifinal losers cross to the opposite half before the third-place bout.
    expect(feederNumbers(26)).toEqual([14, 24])
    expect(feederNumbers(27)).toEqual([25, 13])
    expect(feederNumbers(28)).toEqual([26, 27])
  })

  it("previews a 12-wrestler bracket without changing an eight-wrestler field", () => {
    const draw = buildEightManDeDraw(149, mockParticipants(), new Date().toISOString(), 12)
    const bout = (number: number) => draw.bouts.find((item) => item.boutNumber === number)

    expect(draw.bracketSize).toBe(16)
    expect(draw.previewFieldSize).toBe(12)
    expect(draw.confirmedCount).toBe(8)
    expect(draw.openSpots).toBe(4)
    expect(draw.isComplete).toBe(false)
    expect(bout(2)?.top).toEqual({ kind: "empty", label: "Seed 9 · Open" })
    expect(bout(4)?.top).toEqual({ kind: "empty", label: "Seed 13 · Bye" })
    expect(bout(3)?.bottom).toEqual({ kind: "empty", label: "Seed 12 · Open" })
  })
})
