import { describe, expect, it } from "vitest"

import { ASK_IN_WRITING, ASK_THE_COACH, BOTTOM_LINE, BY_LEVEL, CALCULATOR, FOUR_SOURCES, LOANS, NOT_INCLUDED, TWO_PRICES } from "./what-we-owe"

describe("What will we actually owe? guide", () => {
  it("reads every fact from the library (a renamed heading fails here, not on the page)", () => {
    expect(TWO_PRICES[1].lines[0]).toMatch(/^Net price is what a student pays for one year/)
    expect(FOUR_SOURCES.map((c) => c.title)).toEqual(["Government grants", "The college's own aid", "Athletic scholarship", "Outside scholarships"])
    expect(FOUR_SOURCES[0].lines.join(" ")).toMatch(/FAFSA/)
    expect(FOUR_SOURCES[0].lines.join(" ")).toMatch(/Pell Grants/)
    expect(CALCULATOR.what).toMatch(/net price calculator/)
    expect(LOANS).toBe("Scholarships and grants do not have to be paid back; loans do.")
    expect(BY_LEVEL.rows.length).toBeGreaterThanOrEqual(5)
    expect(BOTTOM_LINE.steps.length).toBe(4)
    expect(ASK_IN_WRITING).toHaveLength(2)
  })

  it("asks the coach the three questions: how much, how many years, does it renew", () => {
    expect(ASK_THE_COACH.map((q) => q.ask)).toEqual(["How much?", "For how many years?", "Does it renew?"])
    for (const q of ASK_THE_COACH) expect(q.why).toMatch(/[.]$/)
  })

  it("names no grant or scholarship the library does not verify", () => {
    const text = [...TWO_PRICES, ...FOUR_SOURCES].flatMap((c) => c.lines).join(" ")
    expect(text).not.toMatch(/CSS|PLUS loan|work-study|Need-Based Scholarship/i)
    expect(NOT_INCLUDED.length).toBeGreaterThan(5)
  })

  it("never asks about income, or compares a family to others", () => {
    const text = [...TWO_PRICES, ...FOUR_SOURCES].flatMap((c) => c.lines).join(" ")
    expect(text).not.toMatch(/families like yours|your income|how much do you earn/i)
  })
})
