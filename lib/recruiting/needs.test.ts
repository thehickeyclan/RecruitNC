import { describe, expect, it } from "vitest"

import {
  checkFilters,
  cleanNeedInput,
  collegeWeightsFromCompeted,
  confirmedLabel,
  gendersFor,
  isLiveNeed,
  milesToState,
  needFitsWrestler,
  needHeadline,
  needStatus,
  passesFilters,
} from "./needs"

const now = new Date("2026-11-02T12:00:00Z")
const ago = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString()

describe("needStatus", () => {
  it("is live until 60 days, asks to confirm until 90, then expires", () => {
    expect(needStatus({ confirmedAt: ago(10), clearedAt: null }, now)).toBe("active")
    expect(needStatus({ confirmedAt: ago(60), clearedAt: null }, now)).toBe("confirm")
    expect(needStatus({ confirmedAt: ago(90), clearedAt: null }, now)).toBe("expired")
    expect(needStatus({ confirmedAt: ago(1), clearedAt: ago(0) }, now)).toBe("cleared")
  })
  it("families never see an expired or cleared need", () => {
    expect(isLiveNeed({ confirmedAt: ago(89), clearedAt: null }, now)).toBe(true)
    expect(isLiveNeed({ confirmedAt: ago(91), clearedAt: null }, now)).toBe(false)
    expect(isLiveNeed({ confirmedAt: ago(5), clearedAt: ago(1) }, now)).toBe(false)
  })
  it("says when it was confirmed", () => {
    expect(confirmedLabel(ago(0), now)).toBe("Confirmed today")
    expect(confirmedLabel(ago(12), now)).toBe("Confirmed 12 days ago")
  })
})

describe("gendersFor", () => {
  it("follows the coach's program", () => {
    expect(gendersFor("mens", "Female")).toEqual(["Male"])
    expect(gendersFor("womens", "Male")).toEqual(["Female"])
    expect(gendersFor("both", "Male")).toEqual(["Male", "Female"])
    expect(gendersFor(null, "Female")).toEqual(["Female"])
  })
})

describe("cleanNeedInput", () => {
  const allowed = { genders: ["Male"] as Array<"Male" | "Female">, classYears: [2027, 2028, 2029, 2030] }
  it("keeps only real college weights and current classes", () => {
    const r = cleanNeedInput({ gender: "Male", weights: [149, 150, 285, 149], classYears: [2026, 2028], minGpa: "3", maxMiles: 500, resultsLevel: "state_placer" }, allowed)
    expect(r).toEqual({ ok: true, input: { gender: "Male", weights: [149, 285], classYears: [2028], minGpa: 3, maxMiles: 500, resultsLevel: "state_placer" } })
  })
  it("refuses a gender outside the program, and empty picks", () => {
    expect(cleanNeedInput({ gender: "Female", weights: [124], classYears: [2028] }, allowed).ok).toBe(false)
    expect(cleanNeedInput({ gender: "Male", weights: [], classYears: [2028] }, allowed).ok).toBe(false)
    expect(cleanNeedInput({ gender: "Male", weights: [149], classYears: [] }, allowed).ok).toBe(false)
  })
  it("drops an unknown results level and a silly GPA", () => {
    const r = cleanNeedInput({ gender: "Male", weights: [149], classYears: [2028], minGpa: 9, resultsLevel: "olympian" }, allowed)
    expect(r.ok && r.input.minGpa).toBe(null)
    expect(r.ok && r.input.resultsLevel).toBe("any")
  })
})

describe("matching on the weight last competed at", () => {
  it("projects onto the college weight at or above and the next one up", () => {
    expect(collegeWeightsFromCompeted("144", "Male")).toEqual([149, 157])
    expect(collegeWeightsFromCompeted("106", "Female")).toEqual([110, 117])
  })
  it("no result on file means no weight, never the typed one", () => {
    expect(collegeWeightsFromCompeted(null, "Male")).toEqual([])
    expect(collegeWeightsFromCompeted("", "Male")).toEqual([])
  })
  it("fits on gender, class and weight", () => {
    const need = { gender: "Male" as const, weight: 157, classYears: [2027, 2028] }
    expect(needFitsWrestler(need, { gender: "Male", classYear: 2028, competedWeight: "150" })).toBe(true)
    expect(needFitsWrestler(need, { gender: "Male", classYear: 2029, competedWeight: "150" })).toBe(false)
    expect(needFitsWrestler(need, { gender: "Female", classYear: 2028, competedWeight: "150" })).toBe(false)
    expect(needFitsWrestler(need, { gender: "Male", classYear: 2028, competedWeight: "190" })).toBe(false)
  })
})

describe("checkFilters", () => {
  const facts = { gpa: null, miles: null, statePlacer: false, nationalPlacer: false, nationallyRanked: false }
  it("a fact not on file is unknown, never a miss", () => {
    const checks = checkFilters({ minGpa: 3, maxMiles: 500, resultsLevel: "any" }, facts)
    expect(checks.map((c) => c.status)).toEqual(["unknown", "unknown"])
    expect(passesFilters(checks)).toBe(true)
  })
  it("misses on a low GPA or too far", () => {
    expect(passesFilters(checkFilters({ minGpa: 3, maxMiles: null, resultsLevel: "any" }, { ...facts, gpa: 2.6 }))).toBe(false)
    expect(passesFilters(checkFilters({ minGpa: null, maxMiles: 250, resultsLevel: "any" }, { ...facts, miles: 600 }))).toBe(false)
  })
  it("results levels nest: a national placer is also a state placer", () => {
    expect(passesFilters(checkFilters({ minGpa: null, maxMiles: null, resultsLevel: "state_placer" }, { ...facts, nationalPlacer: true }))).toBe(true)
    expect(passesFilters(checkFilters({ minGpa: null, maxMiles: null, resultsLevel: "national_placer" }, { ...facts, statePlacer: true }))).toBe(false)
    expect(passesFilters(checkFilters({ minGpa: null, maxMiles: null, resultsLevel: "nationally_ranked" }, { ...facts, nationallyRanked: true }))).toBe(true)
  })
})

describe("labels and distance", () => {
  it("headline", () => {
    expect(needHeadline({ weight: 149, classYears: [2028, 2027] })).toBe("149 · Classes of 2027 and 2028")
    expect(needHeadline({ weight: 285, classYears: [2027] })).toBe("285 · Class of 2027")
  })
  it("miles from campus to a state's centre", () => {
    const campbell: [number, number] = [35.41, -78.86]
    expect(milesToState(campbell, "NC")).toBeLessThan(60)
    expect(milesToState(campbell, "PA")!).toBeGreaterThan(250)
    expect(milesToState(campbell, null)).toBe(null)
    expect(milesToState(null, "NC")).toBe(null)
  })
})
