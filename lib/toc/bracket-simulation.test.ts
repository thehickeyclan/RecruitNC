import { describe, expect, it } from "vitest"
import { buildEightManDeDraw } from "@/lib/toc/eight-man-de-bracket"
import { buildSimulatedTocDraw, simulationBoutParticipants, updateSimulationPick } from "@/lib/toc/bracket-simulation"
import type { TocBracketParticipant } from "@/lib/toc/bracket-types"

const participants: TocBracketParticipant[] = Array.from({ length: 8 }, (_, index) => ({
  athleteId: `a${index + 1}`,
  invitationId: `i${index + 1}`,
  seed: index + 1,
  name: `Wrestler ${index + 1}`,
  school: null,
  photoUrl: null,
  graduationYear: 2027,
}))

describe("TOC bracket simulation", () => {
  it("feeds round-one winners and losers through championship and consolation", () => {
    const draw = buildEightManDeDraw(117, participants, "2026-08-05T00:00:00Z")
    let picks = {}
    picks = updateSimulationPick(draw, picks, 1, "a1")
    picks = updateSimulationPick(draw, picks, 2, "a4")
    picks = updateSimulationPick(draw, picks, 3, "a3")
    picks = updateSimulationPick(draw, picks, 4, "a2")

    expect(simulationBoutParticipants(draw, picks, 5)).toEqual(["a8", "a5"])
    expect(simulationBoutParticipants(draw, picks, 6)).toEqual(["a6", "a7"])
    expect(simulationBoutParticipants(draw, picks, 7)).toEqual(["a1", "a4"])
    expect(simulationBoutParticipants(draw, picks, 8)).toEqual(["a3", "a2"])

    picks = updateSimulationPick(draw, picks, 5, "a8")
    picks = updateSimulationPick(draw, picks, 6, "a6")
    picks = updateSimulationPick(draw, picks, 7, "a1")
    picks = updateSimulationPick(draw, picks, 8, "a2")
    expect(simulationBoutParticipants(draw, picks, 9)).toEqual(["a3", "a8"])
    expect(simulationBoutParticipants(draw, picks, 10)).toEqual(["a6", "a4"])
    expect(simulationBoutParticipants(draw, picks, 11)).toEqual(["a1", "a2"])
  })

  it("clears downstream picks when an earlier winner changes", () => {
    const draw = buildEightManDeDraw(117, participants, "2026-08-05T00:00:00Z")
    let picks = updateSimulationPick(draw, {}, 1, "a1")
    picks = updateSimulationPick(draw, picks, 2, "a4")
    picks = updateSimulationPick(draw, picks, 7, "a1")
    picks = updateSimulationPick(draw, picks, 1, "a8")
    expect(picks[7]).toBeUndefined()
    expect(buildSimulatedTocDraw(draw, picks).bouts.find((bout) => bout.boutNumber === 7)?.top).toEqual({
      kind: "athlete",
      athleteId: "a8",
    })
  })

  it("automatically advances 16-slot byes and routes quarterfinal losers into consolation", () => {
    const expanded = Array.from({ length: 12 }, (_, index) => ({
      athleteId: `x${index + 1}`,
      invitationId: `xi${index + 1}`,
      seed: index + 1,
      name: `Expanded ${index + 1}`,
      school: null,
      photoUrl: null,
      graduationYear: 2027,
    }))
    const draw = buildEightManDeDraw(149, expanded, "2026-08-06T00:00:00Z")
    let picks = updateSimulationPick(draw, {}, 2, "x8")

    expect(simulationBoutParticipants(draw, picks, 9)).toEqual(["x1", "x8"])
    expect(simulationBoutParticipants(draw, picks, 16)).toEqual(["x9"])
    picks = updateSimulationPick(draw, picks, 9, "x1")
    expect(simulationBoutParticipants(draw, picks, 20)).toEqual(["x8"])
  })
})

describe("nine-man field", () => {
  const nine = Array.from({ length: 9 }, (_, index) => ({
    athleteId: `seed-${index + 1}`,
    invitationId: `seed-inv-${index + 1}`,
    seed: index + 1,
    name: `Seed ${index + 1}`,
    school: "Test HS",
    photoUrl: null,
    graduationYear: 2027,
  }))
  const draw = buildEightManDeDraw(133, nine, new Date().toISOString(), 9)

  it("does not walk the top seed into the final on their own", () => {
    // Their quarterfinal opponent is the pigtail winner, undecided until someone picks it. One
    // wrestler resolving is not a bye — it is a wrestler waiting for an opponent.
    expect(simulationBoutParticipants(draw, {}, 15)).toEqual([])
    expect(simulationBoutParticipants(draw, {}, 13)).toEqual([])
  })

  it("still advances a genuine bye", () => {
    // Bout 1 is seed 1 against an empty sixteenth slot: that one really is a walkover.
    expect(simulationBoutParticipants(draw, {}, 1)).toEqual(["seed-1"])
  })

  it("brings the top seed forward only once the pigtail is decided", () => {
    const quarter = simulationBoutParticipants(draw, { 2: "seed-8" }, 9)
    expect(quarter).toContain("seed-1")
    expect(quarter).toContain("seed-8")
    // And still no further: the quarterfinal has not been wrestled.
    expect(simulationBoutParticipants(draw, { 2: "seed-8" }, 13)).toEqual([])
  })
})

describe("nine-man consolation", () => {
  const nine = Array.from({ length: 9 }, (_, index) => ({
    athleteId: `seed-${index + 1}`,
    invitationId: `seed-inv-${index + 1}`,
    seed: index + 1,
    name: `Seed ${index + 1}`,
    school: "Test HS",
    photoUrl: null,
    graduationYear: 2027,
  }))
  const draw = buildEightManDeDraw(133, nine, new Date().toISOString(), 9)

  it("puts the pigtail loser into consolation as soon as the pigtail is picked", () => {
    // The consolation bout reaches the pigtail through bout 16, which pairs "Loser Bout 1" —
    // a walkover, so nobody — with "Loser Bout 2". One wrestler arrives, and he advances.
    expect(simulationBoutParticipants(draw, {}, 2)).toEqual(["seed-9", "seed-8"])
    expect(simulationBoutParticipants(draw, { 2: "seed-8" }, 21)).toContain("seed-9")
  })

  it("keeps the pigtail winner out of consolation", () => {
    expect(simulationBoutParticipants(draw, { 2: "seed-8" }, 21)).not.toContain("seed-8")
  })
})
