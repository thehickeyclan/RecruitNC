import { describe, expect, it } from "vitest"
import {
  NCHSAA_FOUR_TIME_STATE_CHAMPIONS,
  sortMultiTimeChampionsChronological,
} from "@/lib/nchsaa-four-time-state-champions-data"

describe("sortMultiTimeChampionsChronological", () => {
  it("orders 4x champs earliest first title year first (Mike Kendall → recent class last)", () => {
    const sorted = sortMultiTimeChampionsChronological(NCHSAA_FOUR_TIME_STATE_CHAMPIONS)
    expect(sorted).toHaveLength(17)
    expect(sorted[0]?.wrestler_name).toBe("Mike Kendall")
    expect(sorted[0]?.championships[0]?.year).toBe(1988)
    expect(sorted[0]?.championships.map((c) => c.year)).toEqual([1988, 1989, 1990, 1991])
    const lastThree = sorted.slice(-3).map((c) => c.wrestler_name)
    expect(lastThree).toEqual(["Bentley Sly", "Lorenzo Alston", "Cael Dunn"])
    expect(sorted[sorted.length - 1]?.wrestler_name).toBe("Cael Dunn")
  })
})
