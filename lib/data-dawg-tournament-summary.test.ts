import { describe, expect, it } from "vitest"
import { formatNhscaLabelForDataDawg, formatNhscaLineForDataDawg } from "@/lib/data-dawg-tournament-summary"

describe("formatNhscaLabelForDataDawg", () => {
  it("shows record instead of Participated when record exists", () => {
    expect(
      formatNhscaLabelForDataDawg({
        year: 2026,
        placement: "Participated",
        record: "4-2",
        weight: "138",
        division: "Sophomore",
      }),
    ).toBe("4-2 record")
  })

  it("formats full line with division and weight", () => {
    expect(
      formatNhscaLineForDataDawg({
        year: 2025,
        placement: "",
        record: "2-2",
        weight: "126",
        division: "Freshman",
      }),
    ).toBe("- 2025: 2-2 record (Freshman, 126 lbs)")
  })
})
