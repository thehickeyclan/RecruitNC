import { describe, expect, it } from "vitest"
import { buildEightManDeDraw, roundOneBouts, validateBracketParticipants, validatePartialBracketPublish } from "@/lib/toc/eight-man-de-bracket"
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
  it("requires eight unique seeds 1-8", () => {
    const partial = mockParticipants().slice(0, 7)
    expect(validateBracketParticipants(partial)).toContain("exactly 8")
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
})
