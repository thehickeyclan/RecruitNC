import { describe, expect, it } from "vitest"

import { academicFit, athleticFit, cleanProfile, costFit, fitScore, goalsFit, milesBetween, EMPTY_PROFILE } from "./family-fit"

const champ = { tier: "state-champion" as const, national: false }
const placer = { tier: "state-placer" as const, national: false }
const none = { tier: "none" as const, national: false }

describe("best fit for a family", () => {
  it("says what programs at the level typically want to see, then where the wrestler is so far", () => {
    const d1 = [champ, champ, champ, champ, placer, champ]
    const line = athleticFit(placer, d1, "D1", "men", "Gavin")
    expect(line.text).toBe("D1 programs typically want to see a state champion: 5 of the 6 NC men who went D1 were state champions, 1 more placed at state. Gavin so far: a state placer.")
    expect(line.status).toBe("stretch")
    expect(athleticFit(none, d1, "D1", "men").status).toBe("concern")
    expect(athleticFit(champ, d1, "D1", "men").status).toBe("fit")
    expect(athleticFit(champ, [champ, placer], "D1", "women").status).toBe("unknown")
  })

  describe("academic fit for a recruited wrestler", () => {
    const d1 = { levelName: "D1", gpa: 2.3, coreCourses: true, shortfall: null, twoOfThree: null, none: null }
    const d2 = { ...d1, levelName: "D2", gpa: 2.2, shortfall: "Partial qualifier: you may practice and receive aid, but not compete, in the first year" }
    const naia = { levelName: "NAIA", gpa: 2.3, coreCourses: false, shortfall: null, twoOfThree: { act: 18, sat: 970, gpa: 2.0 }, none: null }
    const d3 = { levelName: "D3", gpa: null, coreCourses: false, shortfall: null, twoOfThree: null, none: "Division III has no NCAA GPA minimum. Getting admitted is the bar." }
    const appState = { group: null, act: null, admitRate: 89 }
    const nc = { low: 2.9, high: 4.1, count: 8, label: "NC men who went to Appalachian State" }

    it("does not call a college a stretch for scores under the all-student middle half (App State, 5 Nov 2026)", () => {
      const line = academicFit({ ...appState, floor: d1, gpa: 3.1, sat: { score: 1050, low: 1100, high: 1280 } })
      expect(line.status).toBe("fit")
      expect(line.text).toContain("clears the 2.3 core-course GPA D1 needs")
      expect(line.text).toContain("SAT 1050 is below the middle half of admitted students (1100 to 1280)")
      expect(line.text).toContain("These numbers are for all students. Coaches can often help a recruited wrestler in admissions.")
    })

    it("makes the level's eligibility minimum the only concern", () => {
      expect(academicFit({ ...appState, floor: d1, gpa: 2.1, sat: null }).status).toBe("concern")
      const short = academicFit({ ...appState, floor: d2, gpa: 2.0, sat: null })
      expect(short.status).toBe("concern")
      expect(short.text).toContain("Partial qualifier: you may practice and receive aid, but not compete, in the first year")
      expect(academicFit({ ...appState, floor: d2, gpa: 2.2, sat: null }).status).toBe("fit")
    })

    it("lets the NAIA's two of three clear a GPA under 2.3", () => {
      expect(academicFit({ ...appState, floor: naia, gpa: 2.1, sat: null, act: { score: 19, low: 18, high: 24 } }).status).toBe("fit")
      expect(academicFit({ ...appState, floor: naia, gpa: 2.1, sat: null }).status).toBe("concern")
      expect(academicFit({ ...appState, floor: naia, gpa: 1.9, sat: null, act: { score: 22, low: 18, high: 24 } }).status).toBe("concern")
    })

    it("says Division III and junior college set no GPA minimum", () => {
      const line = academicFit({ ...appState, floor: d3, gpa: 3.0, sat: null })
      expect(line.status).toBe("fit")
      expect(line.text).toBe("Division III has no NCAA GPA minimum. Getting admitted is the bar.")
    })

    it("compares GPA with the lowest NC wrestler who went there, never the average", () => {
      const inRange = academicFit({ ...appState, floor: d1, gpa: 3.0, group: nc, sat: null })
      expect(inRange.status).toBe("fit")
      expect(inRange.text).toBe("GPA 3.00 clears the 2.3 core-course GPA D1 needs to compete (the NCAA counts core courses only). 8 NC men who went to Appalachian State gave a GPA of 2.90 to 4.10.")
      const below = academicFit({ ...appState, floor: d1, gpa: 2.7, group: nc, sat: null })
      expect(below.status).toBe("stretch")
      expect(below.text).toContain("GPA 2.70 is below all 8 NC men who went to Appalachian State who gave a GPA (lowest 2.90)")
    })

    it("holds a highly selective college to its middle half", () => {
      const harvard = { floor: d1, gpa: 3.9, group: null, act: null }
      expect(academicFit({ ...harvard, sat: { score: 1250, low: 1500, high: 1580 }, admitRate: 3 }).status).toBe("stretch")
      expect(academicFit({ ...harvard, sat: { score: 1550, low: 1500, high: 1580 }, admitRate: 3 }).status).toBe("fit")
      expect(academicFit({ ...harvard, sat: null, admitRate: 3 }).status).toBe("stretch")
      // UNC, 19% admitted, is not held to it.
      expect(academicFit({ ...harvard, sat: { score: 1250, low: 1370, high: 1500 }, admitRate: 19 }).status).toBe("fit")
    })

    it("says so when there is nothing to compare", () => {
      expect(academicFit({ floor: null, gpa: null, group: null, sat: null, act: null, admitRate: 40 }).status).toBe("unknown")
      expect(academicFit({ floor: d1, gpa: null, group: null, sat: null, act: null, admitRate: 40 }).status).toBe("unknown")
    })
  })

  it("sets what families at their income paid against the budget", () => {
    expect(costFit({ netPrice: 20_000, netNote: "", published: 27_000, budget: 25_000 }).status).toBe("fit")
    expect(costFit({ netPrice: 28_000, netNote: "", published: 40_000, budget: 25_000 }).status).toBe("stretch")
    expect(costFit({ netPrice: null, netNote: "In-state only.", published: 79_512, budget: 25_000 }).status).toBe("concern")
    expect(costFit({ netPrice: 20_000, netNote: "", published: 27_000, budget: null }).status).toBe("unknown")
  })

  it("checks distance, size and setting against what the family said; majors never count", () => {
    const profile = { ...EMPTY_PROFILE, majors: ["52", "14"], maxMiles: 300, size: "medium" as const, settings: ["town" as const] }
    const line = goalsFit(profile, { majors: ["52", "26"], miles: 120, undergrads: 8_000, setting: "Town" })
    expect(line.status).toBe("fit")
    expect(line.text).toBe("Fits: 120 miles from home, medium (8,000 undergraduates), town.")
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
