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
