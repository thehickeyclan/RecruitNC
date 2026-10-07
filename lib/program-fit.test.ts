import { describe, expect, it } from "vitest"
import {
  EMPTY_CRITERIA,
  evaluateProgramFit,
  majorMatches,
  projectedCollegeWeights,
  sanitizeCriteria,
  summarizeFit,
  describePerfectRecruit,
  type FitSubject,
} from "./program-fit"

const subject = (over: Partial<FitSubject> = {}): FitSubject => ({
  graduationYear: 2027,
  collegeWeightClass: null,
  currentWeight: "138",
  gpa: "3.4",
  sat: null,
  act: null,
  academicInterest: "Finance",
  nationalEvents: 2,
  ...over,
})

describe("projected college weights", () => {
  it("takes the athlete's own projection first", () => {
    expect(projectedCollegeWeights({ collegeWeightClass: "141", currentWeight: "126" })!.weights).toEqual([141])
  })
  it("otherwise the class at or above, and the one after", () => {
    expect(projectedCollegeWeights({ collegeWeightClass: null, currentWeight: "138" })!.weights).toEqual([141, 149])
    expect(projectedCollegeWeights({ collegeWeightClass: null, currentWeight: "285" })!.weights).toEqual([285])
  })
  it("has nothing to say without a weight", () => {
    expect(projectedCollegeWeights({ collegeWeightClass: null, currentWeight: null })).toBeNull()
  })
})

describe("program fit", () => {
  it("checks nothing the program has not asked for", () => {
    expect(evaluateProgramFit(subject(), EMPTY_CRITERIA)).toEqual([])
  })

  it("never marks a missing GPA as a miss", () => {
    const [gpa] = evaluateProgramFit(subject({ gpa: null }), { ...EMPTY_CRITERIA, minGpa: 3.0 })
    expect(gpa!.status).toBe("unknown")
    const [held] = evaluateProgramFit(subject({ gpa: "3.4" }), { ...EMPTY_CRITERIA, minGpa: 3 })
    expect(held!.detail).toBe("3.4 against a 3.0 floor")
  })

  it("passes either test floor", () => {
    const [tests] = evaluateProgramFit(subject({ act: "27" }), { ...EMPTY_CRITERIA, minSat: 1200, minAct: 25 })
    expect(tests!.status).toBe("fit")
    const [low] = evaluateProgramFit(subject({ sat: "1050" }), { ...EMPTY_CRITERIA, minSat: 1200 })
    expect(low!.status).toBe("miss")
  })

  it("fits a weight the wrestler is growing into", () => {
    const [w] = evaluateProgramFit(subject({ currentWeight: "145" }), { ...EMPTY_CRITERIA, targetWeights: [157] })
    expect(w!.status).toBe("fit")
    const [miss] = evaluateProgramFit(subject({ currentWeight: "145" }), { ...EMPTY_CRITERIA, targetWeights: [197] })
    expect(miss!.status).toBe("miss")
  })

  it("matches majors loosely and counts Undecided as open", () => {
    expect(majorMatches("Pre-Med", ["Health Sciences / Pre-Med"])).toBe("Health Sciences / Pre-Med")
    expect(majorMatches("Exercise science ", ["Exercise Science"])).toBe("Exercise Science")
    expect(majorMatches("Nursing", ["Finance"])).toBeNull()
    const [m] = evaluateProgramFit(subject({ academicInterest: "Undecided" }), { ...EMPTY_CRITERIA, majors: ["Finance"] })
    expect(m!.status).toBe("fit")
  })

  it("wants an individual national event when asked", () => {
    const [n] = evaluateProgramFit(subject({ nationalEvents: 0 }), { ...EMPTY_CRITERIA, requireNational: true })
    expect(n!.status).toBe("miss")
  })
})

describe("perfect recruit", () => {
  it("wants the state finish it asked for, and a missing placing is a miss", () => {
    const want = { ...EMPTY_CRITERIA, stateFinish: "finalist" as const }
    const [ok] = evaluateProgramFit(subject({ stateBestPlace: 2, stateBestLabel: "2nd, 2026 6A 113" }), want)
    expect(ok!.status).toBe("fit")
    const [third] = evaluateProgramFit(subject({ stateBestPlace: 3, stateBestLabel: "3rd" }), want)
    expect(third!.status).toBe("miss")
    const [none] = evaluateProgramFit(subject({ stateBestPlace: null }), want)
    expect(none!.status).toBe("miss")
  })

  it("marks the must-haves", () => {
    const checks = evaluateProgramFit(subject(), { ...EMPTY_CRITERIA, targetWeights: [197], minGpa: 3.0, mustHaves: ["weight"] })
    expect(checks.find((c) => c.key === "weight")!.mustHave).toBe(true)
    expect(checks.find((c) => c.key === "gpa")!.mustHave).toBe(false)
  })

  it("says who matches more, and warns when the edge leader misses a must-have", () => {
    const c = { ...EMPTY_CRITERIA, classYears: [2028], minGpa: 3.0, requireNational: true, mustHaves: ["class" as const] }
    const richards = evaluateProgramFit(subject({ graduationYear: 2027, gpa: "4.3", nationalEvents: 5 }), c)
    const mcdermott = evaluateProgramFit(subject({ graduationYear: 2028, gpa: null, nationalEvents: 3 }), c)
    const out = summarizeFit({ leftName: "Richards", rightName: "McDermott", left: richards, right: mcdermott, edgeLeader: "left" })
    expect(out.lines[0]).toBe("Richards matches 2 of 3 of your perfect recruit, missing Class.")
    expect(out.lines[1]).toBe("McDermott matches 2 of 3 of your perfect recruit (GPA not on file).")
    expect(out.cautions).toEqual(["Richards leads on edges but misses your must-have: Class."])
  })

  it("says nothing when the program set no needs", () => {
    expect(summarizeFit({ leftName: "A", rightName: "B", left: [], right: [], edgeLeader: null })).toEqual({ lines: [], cautions: [] })
  })

  it("keeps the default must-haves for a set saved before they existed", () => {
    expect(sanitizeCriteria({ targetWeights: [141] }).mustHaves).toEqual(["weight", "class"])
    expect(sanitizeCriteria({ mustHaves: [] }).mustHaves).toEqual([])
    expect(sanitizeCriteria({ priorities: ["strength", "bogus", "gpa"] }).priorities).toEqual(["strength", "gpa"])
  })
})

describe("describePerfectRecruit", () => {
  it("reads like a coach's shorthand", () => {
    expect(
      describePerfectRecruit({ ...EMPTY_CRITERIA, targetWeights: [125, 133, 141], classYears: [2028], minGpa: 3, requireNational: true, majors: ["Finance"] }),
    ).toEqual(["125–141 lbs", "Class of 2028", "3.0+ GPA", "Finance", "National experience"])
    expect(describePerfectRecruit({ ...EMPTY_CRITERIA, targetWeights: [125, 141] })).toEqual(["125, 141 lbs"])
  })
})

describe("sanitizeCriteria", () => {
  it("keeps only real college weights and sane floors", () => {
    const c = sanitizeCriteria({ targetWeights: [141, "149", 150, 999], minGpa: "3.2", minSat: 9000, classYears: [2027, 1900], requireNational: "yes" })
    expect(c.targetWeights).toEqual([141, 149])
    expect(c.minGpa).toBe(3.2)
    expect(c.minSat).toBeNull()
    expect(c.classYears).toEqual([2027])
    expect(c.requireNational).toBe(false)
  })
})
