import { describe, expect, it } from "vitest"
import {
  formatFargoDivisionLabel,
  formatFargoDivisionLabelWithStyle,
  formatFargoPlacementForDisplay,
  formatFargoRecord,
  parseFargoPlacement,
} from "@/lib/fargo-results"

describe("fargo results formatting", () => {
  it("parses placement strings", () => {
    expect(parseFargoPlacement("4th")).toBe(4)
    expect(parseFargoPlacement("8")).toBe(8)
    expect(parseFargoPlacement("")).toBeNull()
  })

  it("formats all-american placements", () => {
    expect(formatFargoPlacementForDisplay(4, true)).toBe("4th All-American")
    expect(formatFargoPlacementForDisplay(null, true)).toBe("All-American")
  })

  it("builds record from wins and losses", () => {
    expect(formatFargoRecord(6, 2, "")).toBe("6-2")
    expect(formatFargoRecord(1, 2, "1-2")).toBe("1-2")
  })

  it("shortens division labels", () => {
    expect(formatFargoDivisionLabel("Junior Boys Freestyle")).toBe("Junior Boys")
    expect(formatFargoDivisionLabel("16U Boys Freestyle")).toBe("16U Boys")
    expect(formatFargoDivisionLabel("Junior Girls Greco-Roman")).toBe("Junior Girls")
  })

  it("preserves style for profile rows that share year, age division, and weight", () => {
    expect(formatFargoDivisionLabelWithStyle("16U Boys Freestyle", "FS")).toBe("16U Boys Freestyle")
    expect(formatFargoDivisionLabelWithStyle("16U Boys Greco-Roman", "GR")).toBe("16U Boys Greco-Roman")
  })
})
