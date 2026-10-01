import { describe, expect, it } from "vitest"
import { isHighSchoolEvent } from "@/lib/high-school-window"

describe("isHighSchoolEvent", () => {
  const c2027 = { graduationYear: 2027 }
  it("counts Super 32 in the freshman fall", () => {
    expect(isHighSchoolEvent({ ...c2027, year: 2023, event: "Super 32" })).toBe(true)
    expect(isHighSchoolEvent({ ...c2027, year: 2022, event: "Super 32" })).toBe(false)
  })
  it("drops the eighth-grade state tournament and NHSCA", () => {
    expect(isHighSchoolEvent({ ...c2027, year: 2023, event: "NCHSAA" })).toBe(false)
    expect(isHighSchoolEvent({ ...c2027, year: 2024, event: "NCHSAA" })).toBe(true)
    expect(isHighSchoolEvent({ ...c2027, year: 2023, event: "NHSCA" })).toBe(false)
  })
  it("counts Fargo the summer after eighth grade - middle school is over", () => {
    expect(isHighSchoolEvent({ ...c2027, year: 2023, event: "Fargo" })).toBe(true)
    expect(isHighSchoolEvent({ ...c2027, year: 2022, event: "Fargo" })).toBe(false)
  })
  it("uses a real date when there is one", () => {
    expect(isHighSchoolEvent({ ...c2027, year: 2023, eventDate: "2023-05-31" })).toBe(false)
    expect(isHighSchoolEvent({ ...c2027, year: 2023, eventDate: "2023-06-01" })).toBe(true)
  })
  it("keeps everything when no class year is on file", () => {
    expect(isHighSchoolEvent({ graduationYear: null, year: 2015, event: "NCHSAA" })).toBe(true)
  })
})

import { boutDate, highSchoolBouts, isHighSchoolSeason } from "@/lib/high-school-window"

describe("isHighSchoolSeason", () => {
  it("places a season by its spring", () => {
    expect(isHighSchoolSeason("2024-25", 2028)).toBe(true)
    expect(isHighSchoolSeason("2024-25", 2029)).toBe(false)
  })
  it("trusts a recorded middle school grade", () => {
    expect(isHighSchoolSeason("2025-26", 2027, "8")).toBe(false)
  })
  it("keeps rows it cannot place", () => {
    expect(isHighSchoolSeason("Career", 2029)).toBe(true)
  })
})

describe("bouts", () => {
  it("reads the date formats imports use", () => {
    expect(boutDate("2026-02-19")).toBe("2026-02-19")
    expect(boutDate("12/20/2025")).toBe("2025-12-20")
    expect(boutDate("12/27 - 12/28/2024")).toBe("2024-12-27")
  })
  it("drops middle school bouts and keeps undated ones", () => {
    const b = [{ date: "2025-01-10" }, { date: "2026-01-10" }, { date: "" }]
    expect(highSchoolBouts(b, 2029)).toHaveLength(2)
  })
})
