import { describe, expect, it } from "vitest"
import { dropWideRowsFromOtherSchools } from "./nchsaa-results"
import { plausibleNchsaaYearsForGradYear } from "./nchsaa-plausible-years"

const row = (year: number, school: string) => ({
  year, classification: "4A", weight_class: "132", place: 3, school, wrestler_name: "Eli Thomas",
}) as any

describe("NCHSAA same-name collisions", () => {
  it("drops another school's rows in a year the athlete's own school covers", () => {
    // The real case: Eli Thomas, class of 2026 at Laney, was shown Alleghany rows from the
    // same years. Overlapping years, so no date window can separate them.
    const matched = [row(2025, "Laney")]
    const wide = [row(2025, "Laney"), row(2025, "Alleghany"), row(2023, "Alleghany")]
    const kept = dropWideRowsFromOtherSchools(wide, matched, "Laney")
    expect(kept.map((r) => `${r.year}@${r.school}`)).toEqual(["2025@Laney", "2023@Alleghany"])
  })

  it("keeps a blank school — absence of evidence is not evidence", () => {
    const kept = dropWideRowsFromOtherSchools([row(2025, "")], [row(2025, "Laney")], "Laney")
    expect(kept).toHaveLength(1)
  })

  it("leaves everything alone when the athlete has no school on file", () => {
    const wide = [row(2025, "Alleghany")]
    expect(dropWideRowsFromOtherSchools(wide, [row(2025, "Laney")], undefined)).toEqual(wide)
  })

  it("narrows the year window to a real high school career", () => {
    // Was grad + 4, making the window nine years wide.
    expect(plausibleNchsaaYearsForGradYear(2028)).toEqual({ min: 2024, max: 2029 })
  })
})
