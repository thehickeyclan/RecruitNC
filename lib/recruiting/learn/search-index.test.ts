import { describe, expect, it } from "vitest"

import { buildSearchIndex, searchLearn } from "./search-index"

const index = buildSearchIndex()

describe("searching the Learn library", () => {
  it("covers the rules, the timeline and the tournaments", () => {
    expect(index.length).toBeGreaterThan(40)
    expect(index.some((e) => e.where === "Timeline")).toBe(true)
    expect(index.some((e) => e.where.startsWith("Tournaments"))).toBe(true)
  })

  it("finds what a family would type", () => {
    expect(searchLearn(index, "who pays visit")[0].title).toBe("Who pays for a recruiting visit?")
    expect(searchLearn(index, "NIL").length).toBeGreaterThan(2)
    expect(searchLearn(index, "fargo").some((e) => e.title.startsWith("Fargo"))).toBe(true)
  })

  it("finds the practical steps too", () => {
    expect(searchLearn(index, "spam folder")[0].where).toBe("Working the process")
    expect(searchLearn(index, "questions to ask coach")[0].title).toBe("Questions to ask a college coach")
  })

  it("finds nothing for nothing", () => {
    expect(searchLearn(index, "")).toEqual([])
    expect(searchLearn(index, "zzqx")).toEqual([])
  })
})

import { COACH_QUESTIONS, WORKING_STEPS } from "./working"

describe("working the process", () => {
  it("never says he or his, or names another sport", () => {
    const words = [...WORKING_STEPS.flatMap((s) => [s.heading, ...s.points]), ...COACH_QUESTIONS].join("\n")
    expect(words).not.toMatch(/\b(he|him|his)\b/i)
    expect(words).not.toMatch(/\bsports?\b|football|basketball|soccer/i)
  })
})
