import { describe, expect, it } from "vitest"
import { scheduleStrengthBand, SCHEDULE_BAND_MEDIAN, SCHEDULE_BAND_SAMPLE } from "./schedule-strength-band"

describe("scheduleStrengthBand", () => {
  it("places a wrestler against the real distribution", () => {
    // Measured across 325 NC wrestlers: p25 41, median 53, p75 63, p90 70.
    expect(scheduleStrengthBand(86)?.label).toBe("Top 10% of schedules on file")
    expect(scheduleStrengthBand(65)?.label).toBe("Top quarter of schedules on file")
    expect(scheduleStrengthBand(57)?.label).toBe("Above the median schedule")
    expect(scheduleStrengthBand(45)?.label).toBe("Below the median schedule")
    expect(scheduleStrengthBand(20)?.label).toBe("Bottom quarter of schedules on file")
  })

  it("names its population, so 'out of what' has an answer", () => {
    // The failure this exists to avoid: "top 5%" of a number nobody could define.
    const caption = scheduleStrengthBand(60)!.caption
    expect(caption).toContain(`${SCHEDULE_BAND_SAMPLE} North Carolina wrestlers`)
    expect(caption).toContain(`Median is ${SCHEDULE_BAND_MEDIAN}%`)
  })

  it("never calls a schedule weak", () => {
    for (const share of [0, 10, 25, 40]) {
      expect(scheduleStrengthBand(share)!.label.toLowerCase()).not.toContain("weak")
      expect(scheduleStrengthBand(share)!.label.toLowerCase()).not.toContain("poor")
    }
  })

  it("says nothing when there is no rated schedule", () => {
    expect(scheduleStrengthBand(null)).toBeNull()
    expect(scheduleStrengthBand(undefined)).toBeNull()
  })

  it("clamps rather than trusting a stray value", () => {
    expect(scheduleStrengthBand(140)!.caption).toContain("100%")
    expect(scheduleStrengthBand(-5)!.caption).toContain("0%")
  })
})
