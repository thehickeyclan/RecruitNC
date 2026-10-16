import { describe, expect, it } from "vitest"
import { stateNamedIn } from "./reported-win-state"

describe("stateNamedIn", () => {
  it("reads the state a family typed, as written on Xavier Bernthal's profile", () => {
    expect(stateNamedIn("Virginia State champion")).toBe("VA")
    expect(stateNamedIn("Virginia 3rd Place")).toBe("VA")
    expect(stateNamedIn("Tennesee 4th Place")).toBe("TN")
    expect(stateNamedIn("Alabama 3rd Place")).toBe("AL")
    expect(stateNamedIn("Kentucky 5th Place")).toBe("KY")
    expect(stateNamedIn("VA State Champion")).toBe("VA")
  })
  it("keeps West Virginia apart from Virginia", () => {
    expect(stateNamedIn("West Virginia State Champion")).toBe("WV")
  })
  it("names no state rather than guess", () => {
    expect(stateNamedIn("State Runner Up")).toBeNull()
    expect(stateNamedIn("placed in the state")).toBeNull()
    expect(stateNamedIn("me in a match")).toBeNull()
  })
})
