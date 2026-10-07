import { describe, expect, it } from "vitest"
import {
  EMPTY_CRITERIA,
  evaluateProgramFit,
  majorMatches,
  projectedCollegeWeights,
  sanitizeCriteria,
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
