import { describe, expect, it } from "vitest"
import { slotToDisplay } from "./to-bracket-display"

const participant = (id: string, club: string | null) =>
  ({ athleteId: id, invitationId: id, seed: 1, name: `Wrestler ${id}`, club, photoUrl: null, graduationYear: 2028 }) as never

describe("slotToDisplay affiliation line", () => {
  const byId = new Map([
    ["a", participant("a", "RAW")],
    ["b", participant("b", null)],
  ]) as never

  it("shows a wrestler's club", () => {
    expect(slotToDisplay({ kind: "athlete", athleteId: "a" } as never, byId).subtitle).toBe("RAW")
  })

  it("reads Unaffiliated for a wrestler with no club", () => {
    expect(slotToDisplay({ kind: "athlete", athleteId: "b" } as never, byId).subtitle).toBe("Unaffiliated")
  })

  it("puts nothing under a slot still waiting on an earlier bout", () => {
    // This read "Winner Bout 1 / Unaffiliated" under every empty semifinal and final.
    const feeder = { kind: "feeder", boutNumber: 1, label: "Winner Bout 1" } as never
    expect(slotToDisplay(feeder, byId).subtitle).toBeNull()
  })
})
