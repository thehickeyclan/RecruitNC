import { describe, expect, it } from "vitest"

import { academicFit, athleticFit, cleanProfile, costFit, fitScore, goalsFit, milesBetween, EMPTY_PROFILE } from "./family-fit"

const champ = { tier: "state-champion" as const, national: false }
const placer = { tier: "state-placer" as const, national: false }
const none = { tier: "none" as const, national: false }

describe("best fit for a family", () => {
  it("compares the wrestler with the NC wrestlers who went to the level, and only with five or more", () => {
    const d1 = [champ, champ, champ, champ, placer, champ]
    expect(athleticFit(placer, d1, "D1", "men").status).toBe("stretch")
    expect(athleticFit(none, d1, "D1", "men").status).toBe("concern")
    expect(athleticFit(champ, d1, "D1", "men")).toMatchObject({ status: "fit", text: expect.stringMatching(/6 of the 6 NC men who went D1/) })
    expect(athleticFit(champ, [champ, placer], "D1", "women").status).toBe("unknown")
  })

  it("marks test scores against the middle half and flags very selective colleges", () => {
    expect(academicFit({ sat: { score: 1350, low: 1300, high: 1460 }, act: null, gpa: null, admitRate: 40 }).status).toBe("fit")
    expect(academicFit({ sat: { score: 1250, low: 1300, high: 1460 }, act: null, gpa: null, admitRate: 40 }).status).toBe("stretch")
    expect(academicFit({ sat: { score: 1550, low: 1500, high: 1580 }, act: null, gpa: null, admitRate: 4 }).status).toBe("stretch")
    expect(academicFit({ sat: null, act: null, gpa: null, admitRate: 40 }).status).toBe("unknown")
  })

  it("sets what families at their income paid against the budget", () => {
    expect(costFit({ netPrice: 20_000, netNote: "", published: 27_000, budget: 25_000 }).status).toBe("fit")
    expect(costFit({ netPrice: 28_000, netNote: "", published: 40_000, budget: 25_000 }).status).toBe("stretch")
    expect(costFit({ netPrice: null, netNote: "In-state only.", published: 79_512, budget: 25_000 }).status).toBe("concern")
    expect(costFit({ netPrice: 20_000, netNote: "", published: 27_000, budget: null }).status).toBe("unknown")
  })

  it("checks major, distance, size and setting against what the family said", () => {
    const profile = { ...EMPTY_PROFILE, majors: ["52", "14"], maxMiles: 300, size: "medium" as const, settings: ["town" as const] }
    const line = goalsFit(profile, { majors: ["52", "26"], miles: 120, undergrads: 8_000, setting: "Town" })
    expect(line.status).toBe("stretch")
    expect(line.text).toBe("Fits: offers business, 120 miles from home, medium (8,000 undergraduates), town. Doesn't: no engineering degree.")
    expect(goalsFit(EMPTY_PROFILE, { majors: null, miles: null, undergrads: null, setting: null }).status).toBe("unknown")
  })

  it("orders by fit without letting unknowns count", () => {
    expect(fitScore([{ status: "fit", text: "" }, { status: "unknown", text: "" }])).toBe(2)
    expect(fitScore([{ status: "stretch", text: "" }, { status: "concern", text: "" }])).toBe(1)
  })

  it("keeps only what it understands from the browser", () => {
    expect(cleanProfile({ majors: ["52", "xx", "14", "26", "11"], budget: "30000", homeZip: "27601", maxMiles: -5, size: "huge", settings: ["town", "moon"] })).toEqual({
      majors: ["52", "14", "26"], budget: 30000, homeZip: "27601", maxMiles: null, size: null, settings: ["town"],
    })
  })

  it("measures miles", () => {
    expect(milesBetween([35.78, -78.64], [36.07, -79.79])).toBeGreaterThan(60)
    expect(milesBetween([35.78, -78.64], [36.07, -79.79])).toBeLessThan(75)
  })
})
