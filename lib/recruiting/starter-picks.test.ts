import { describe, expect, it } from "vitest"

import { pickStarter, starterReason, type StarterCandidate } from "./starter-picks"

const c = (id: string, over: Partial<StarterCandidate> = {}): StarterCandidate => ({
  id, name: id, inState: false, miles: null, roomWeight: null, athletic: "unknown", academic: "unknown", cost: "unknown", goals: "unknown", ...over,
})

describe("pickStarter", () => {
  it("never pads: a level with nothing earned is left out", () => {
    const picks = pickStarter([
      { level: "D1", candidates: [c("a"), c("b")] },
      { level: "D2", candidates: [c("c", { inState: true })] },
      { level: "D3", candidates: [] },
    ])
    expect(picks).toEqual([{ id: "c", level: "D2", why: "In your state" }])
  })

  it("can return nothing at all", () => {
    expect(pickStarter([{ level: "D1", candidates: [c("a")] }])).toEqual([])
  })

  it("puts the levels where the results fit first, a concern last", () => {
    const picks = pickStarter([
      { level: "D1", candidates: [c("a", { athletic: "concern", inState: true })] },
      { level: "D2", candidates: [c("b", { athletic: "stretch", inState: true })] },
      { level: "D3", candidates: [c("d", { athletic: "fit" })] },
    ])
    expect(picks.map((p) => p.level)).toEqual(["D3", "D2", "D1"])
    expect(picks[0].why).toBe("Results fit D3")
  })

  it("counts the athletic line inside a level", () => {
    const [pick] = pickStarter([{ level: "D2", candidates: [c("a", { inState: true }), c("b", { inState: true, athletic: "fit" })] }])
    expect(pick.id).toBe("b")
  })

  it("never picks the same college at two levels", () => {
    const both = c("lh", { inState: true })
    expect(pickStarter([{ level: "D1", candidates: [both] }, { level: "D2", candidates: [both] }])).toHaveLength(1)
  })

  it("breaks ties by distance", () => {
    const [pick] = pickStarter([{ level: "D3", candidates: [c("far", { inState: true, miles: 200 }), c("near", { inState: true, miles: 20 })] }])
    expect(pick.id).toBe("near")
  })
})

describe("starterReason", () => {
  it("says projected opportunity, never room or spot", () => {
    const why = starterReason(c("a", { roomWeight: 174 }), "D1")
    expect(why).toBe("Projected opportunity at 174")
    expect(why).not.toMatch(/room|spot/i)
  })
  it("has no reason without a real one", () => {
    expect(starterReason(c("a", { athletic: "stretch", academic: "stretch" }), "D1")).toBeNull()
  })
})
