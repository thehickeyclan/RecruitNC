import { describe, expect, it } from "vitest"
import {
  buildDataDawgTournamentSummary,
  formatNhscaLabelForDataDawg,
  formatNhscaLineForDataDawg,
} from "@/lib/data-dawg-tournament-summary"

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

describe("buildDataDawgTournamentSummary", () => {
  it("includes verified other-tournament evidence such as NHSCA National Duals", () => {
    const summary = buildDataDawgTournamentSummary({
      nchsaa: [],
      nhsca: [],
      super32: [],
      fargo: [],
      other: [{
        eventKey: "nhsca-national-duals-2026",
        eventName: "2026 NHSCA National Duals",
        eventShortName: "NHSCA National Duals",
        eventState: "VA",
        eventDate: "2026-05-23",
        year: 2026,
        weight: "120",
        wins: 5,
        losses: 5,
        record: "5-5",
        placement: null,
        qualified: false,
        entrants: null,
        club: "Prestige Worldwide - HSB",
      }],
    })
    expect(summary.other).toEqual(["- 2026 NHSCA National Duals: 5-5 record, 120 lbs"])
  })
})
