import { describe, expect, it } from "vitest"
import { super32Dates, super32NoticeActive, super32ReportPromise } from "./super32-report"

describe("Super 32 report notice", () => {
  it("runs until the end of finals day, Eastern, and stops after", () => {
    expect(super32NoticeActive(new Date("2026-10-16T12:00:00-04:00"))).toBe(true)
    expect(super32NoticeActive(new Date("2026-10-25T23:30:00-04:00"))).toBe(true)
    expect(super32NoticeActive(new Date("2026-10-26T00:00:30-04:00"))).toBe(false)
  })
  it("says 24 hours and names every part of the report", () => {
    const s = super32ReportPromise()
    expect(s).toContain("24 hours")
    for (const part of ["placement", "record", "significant wins", "notable losses"]) expect(s).toContain(part)
    expect(super32Dates()).toBe("Oct 24–25")
  })
})
