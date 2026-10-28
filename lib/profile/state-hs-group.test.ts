import { describe, expect, it } from "vitest"
import { cleanClassification, isStateHs, stateHsGroupName } from "./state-hs-group"

describe("state tournament group names", () => {
  it("uses the wrestler's own association", () => {
    expect(stateHsGroupName("SCHSL 5A State Championships")).toBe("SCHSL State Championships")
    expect(stateHsGroupName("NCHSAA 8A State Championships")).toBe("NCHSAA State Championships")
    expect(stateHsGroupName("NCISA State Championships")).toBe("NCISA State Championships")
    expect(stateHsGroupName("VHSL Girls 6A State Championships")).toBe("VHSL Girls State Championships")
  })
  it("names a state we hold no association for by the state, never as a university", () => {
    expect(stateHsGroupName("Ohio D1 State Championships")).toBe("Ohio State Championships")
    expect(stateHsGroupName("West Virginia A-AA State Championships")).toBe("West Virginia State Championships")
    expect(stateHsGroupName("Alaska ASAA/FNBA DI State Championships")).toBe("Alaska State Championships")
  })
  it("keeps freestyle out", () => {
    expect(isStateHs("SC Freestyle & Greco State Championships")).toBe(false)
    expect(isStateHs("SCHSL 5A State Championships")).toBe(true)
  })
  it("cleans classifications that carry the event name", () => {
    expect(cleanClassification("FHSAA Girls State Championships")).toBe("FHSAA Girls")
    expect(cleanClassification("2025 CIAC State Championships")).toBe("CIAC")
    expect(cleanClassification("5A")).toBe("5A")
  })
})
