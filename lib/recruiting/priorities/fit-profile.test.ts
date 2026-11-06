import { describe, expect, it } from "vitest"

import { fitProfileFromAnswers } from "@/lib/recruiting/priorities/fit-profile"
import type { Answer } from "@/lib/recruiting/priorities/sharing"

const a = (key: string, value: unknown): Answer => ({ key, value, sharing: "shared", marker: null })

describe("fitProfileFromAnswers: the survey is the fit profile", () => {
  it("Gavin's parent answers: majors left out, a day's drive, no single size", () => {
    const p = fitProfileFromAnswers([
      a("academics", { majors: ["52", "09"], undecided: false }),
      a("budget", "35_50"),
      a("distance", "day"),
      a("home_zip", "27614"),
      a("school_feel", ["large", "suburb", "town", "medium", "small"]),
    ])
    expect(p).toEqual({ majors: [], budget: 50_000, homeZip: "27614", maxMiles: 500, size: null, settings: ["suburb", "town"] })
  })

  it("the viewer's own answer wins over the other side's", () => {
    expect(fitProfileFromAnswers([a("distance", "2h"), a("distance", "day")]).maxMiles).toBe(110)
  })

  it("no answers, no preferences", () => {
    expect(fitProfileFromAnswers([])).toEqual({ majors: [], budget: null, homeZip: null, maxMiles: null, size: null, settings: [] })
  })
})
