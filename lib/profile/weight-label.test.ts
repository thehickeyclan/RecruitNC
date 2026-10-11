import { describe, expect, it } from "vitest"
import { weightLabel } from "./weight-label"

describe("weightLabel", () => {
  it("reads a scholastic weight as pounds", () => expect(weightLabel("132")).toBe("132 lbs"))
  it("reads a weight nobody wrestles in pounds as kilos", () => expect(weightLabel("57")).toBe("57 kg"))
  it("keeps a unit that is already there", () => expect(weightLabel("120 lbs")).toBe("120 lbs"))
  it("has nothing to say without a weight", () => expect(weightLabel(null)).toBeNull())
})
