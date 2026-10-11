import { describe, expect, it } from "vitest"
import { sameReportedBout } from "./same-reported-bout"

describe("sameReportedBout", () => {
  it("joins a misspelt first name at the same event with the same score", () => {
    expect(
      sameReportedBout(
        { opponent: "Shepard Baumer", date: "2026-03-27", event: "2026 NHSCA High School Nationals", result: "Major Decision 12-4" },
        { opponent: "Shepherd Baumer", date: "2026-03-26", event: "2026 NHSCA High School Nationals", result: "MD 12-4" },
      ),
    ).toBe(true)
  })
  it("keeps brothers apart when the scores differ", () => {
    expect(
      sameReportedBout(
        { opponent: "Shepard Baumer", date: "2026-03-27", event: "2026 NHSCA High School Nationals", result: "Dec 5-2" },
        { opponent: "Tucker Baumer", date: "2026-03-26", event: "2026 NHSCA High School Nationals", result: "MD 12-4" },
      ),
    ).toBe(false)
  })
  it("keeps the same score at a different event apart", () => {
    expect(
      sameReportedBout(
        { opponent: "Shepard Baumer", date: "2026-03-27", event: "Super 32", result: "MD 12-4" },
        { opponent: "Tucker Baumer", date: "2026-03-26", event: "2026 NHSCA High School Nationals", result: "MD 12-4" },
      ),
    ).toBe(false)
  })
  it("does not join falls on a surname alone", () => {
    expect(
      sameReportedBout(
        { opponent: "Shepard Baumer", date: "2026-03-27", event: "NHSCA", result: "Fall 1:20" },
        { opponent: "Tucker Baumer", date: "2026-03-27", event: "NHSCA", result: "Fall 1:20" },
      ),
    ).toBe(false)
  })
})
