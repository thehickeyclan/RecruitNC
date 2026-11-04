import { describe, expect, it } from "vitest"
import { plansForState } from "./plans-for-state"

describe("plansForState", () => {
  it("sells Insider where we rank, and only the Command Center elsewhere", () => {
    expect(plansForState("NC")).toMatchObject({ insider: true, commandCenter: true })
    expect(plansForState("sc")).toMatchObject({ state: "SC", insider: true })
    expect(plansForState("NY")).toMatchObject({ state: "NY", insider: false, commandCenter: true })
  })
  it("shows every plan when the state is unknown", () => {
    expect(plansForState(null)).toMatchObject({ state: null, insider: true })
  })
})

describe("Virginia: live, not ranked yet (3 Nov 2026)", () => {
  it("is open on RecruitWrestlers", async () => {
    const { liveStates } = await import("@/lib/recruiting/brand")
    expect(liveStates(true).map((s) => s.code)).toContain("VA")
  })
  it("is not sold Insider and has no rankings board", async () => {
    const { rankedStates } = await import("@/lib/recruiting/brand")
    expect(rankedStates(true).map((s) => s.code)).not.toContain("VA")
    expect(plansForState("VA").insider).toBe(false)
    expect(plansForState("SC").insider).toBe(true)
  })
})
