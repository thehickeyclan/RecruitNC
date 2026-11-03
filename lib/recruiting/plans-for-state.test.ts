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
