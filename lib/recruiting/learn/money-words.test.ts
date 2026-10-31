import { describe, expect, it } from "vitest"

import { SOURCES } from "./content"
import { FIRST_TIME, MONEY_CHECKED, MONEY_WORDS, moneyWord } from "./money-words"

const text = (w: (typeof MONEY_WORDS)[number]) => [w.term, w.means, w.paidBack, w.go.label, w.yearly?.fact ?? "", w.yearly?.year ?? ""].join(" ")

describe("money words", () => {
  it("defines every word a parent asked about", () => {
    const terms = MONEY_WORDS.map((w) => w.term).join(" | ")
    for (const t of ["Cost of attendance", "net price", "Grant, scholarship or loan", "FAFSA", "Student Aid Index", "Pell Grant", "CSS Profile", "Subsidized and unsubsidized", "Parent PLUS", "Work-study", "529", "Merit aid", "Athletic scholarship", "Renewal", "Revenue share"]) {
      expect(terms).toContain(t)
    }
    expect(new Set(MONEY_WORDS.map((w) => w.id)).size).toBe(MONEY_WORDS.length)
  })

  it("links every definition to an official source in the library", () => {
    for (const w of MONEY_WORDS) {
      expect(w.sources.length, w.id).toBeGreaterThan(0)
      for (const k of w.sources) expect(SOURCES[k], `${w.id}: ${k}`).toBeDefined()
      expect(w.go.href, w.id).toMatch(/^(\/|https:\/\/(studentaid\.gov|collegecost\.ed\.gov|cssprofile\.collegeboard\.org|www\.investor\.gov))/)
    }
    expect(MONEY_CHECKED).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it("never shows a yearly number without its award year", () => {
    for (const w of MONEY_WORDS) {
      const bare = [w.means, w.paidBack].join(" ")
      // Dollar figures and rates live only in `yearly`, which carries its year.
      expect(bare, w.id).not.toMatch(/\$\d|\d%/)
      if (w.yearly) expect(w.yearly.year, w.id).toMatch(/20\d\d/)
    }
    expect(moneyWord("pell").yearly?.year).toMatch(/2026–27/)
    expect(moneyWord("parent-plus").yearly?.fact).toMatch(/\$20,000/)
  })

  it("keeps each definition short and plain", () => {
    for (const w of MONEY_WORDS) {
      // The library's own words are kept whole; ours are held to a few short sentences.
      const sentences = w.means.split(/(?<=[.!?])\s+/).length
      expect(sentences, w.id).toBeLessThanOrEqual(4)
      for (const s of w.means.split(/(?<=[.!?])\s+/)) if (!w.library) expect(s.split(" ").length, `${w.id}: ${s}`).toBeLessThanOrEqual(28)
    }
  })

  it("reads the athletics words from the library", () => {
    expect(moneyWord("athletic-scholarship").means).toMatch(/^"Grant-in-aid" is the NCAA's own term/)
    expect(moneyWord("renewal").means).toMatch(/July 1/)
    expect(moneyWord("revenue-share").means).toMatch(/August 1/)
  })

  it("never asks about income, or compares a family to others", () => {
    for (const w of MONEY_WORDS) expect(text(w), w.id).not.toMatch(/income|families like yours|how much do you earn|earn(s)? (less|more)/i)
  })

  it("starts a first-timer with three steps, in order", () => {
    expect(FIRST_TIME.map((f) => f.word)).toEqual(["fafsa", "net-price", "renewal"])
  })
})
