import { describe, expect, it } from "vitest"
import { buildEightManDeDraw, roundOneBouts, validateBracketParticipants } from "@/lib/toc/eight-man-de-bracket"
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

  it("builds round 1 with standard seed pairings", () => {
    const draw = buildEightManDeDraw(174, mockParticipants(), new Date().toISOString())
    const r1 = roundOneBouts(draw)
    expect(r1).toHaveLength(4)
    expect(r1[0].boutNumber).toBe(1)
    expect(r1.map((b) => b.boutNumber)).toEqual([1, 2, 3, 4])
    expect(draw.bouts.length).toBeGreaterThanOrEqual(14)
  })
})
