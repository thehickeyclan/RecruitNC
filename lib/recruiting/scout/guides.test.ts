import { describe, expect, it } from "vitest"

import { parseGuides, pickSections, queryWords, readGuide } from "./guides"

const LIB = [
  "## NIL and revenue sharing in wrestling [link: learn:nil]\n- NIL means being paid when a business uses your name.\n- Revenue sharing is paid by some Division I colleges.",
  "## NCAA Division II [link: learn:division-2]\nSummary line.\n### When a Division II coach can contact you\nCalls from June 15 after sophomore year.\n### Scholarships\nDivision II wrestling has partial scholarship money.",
  "## NJCAA (junior college) [link: learn:njcaa]\n### Eligibility\nA high school diploma; no minimum GPA.",
].join("\n\n")

describe("library by the piece", () => {
  const guides = parseGuides(LIB)
  it("parses pages and sections", () => {
    expect(guides.map((g) => g.key)).toEqual(["learn:nil", "learn:division-2", "learn:njcaa"])
    expect(guides[1].sections.map((s) => s.heading)).toEqual(["When a Division II coach can contact you", "Scholarships"])
  })
  it("folds recruiting synonyms", () => {
    expect(queryWords("Can a D2 coach call?")).toContain("division")
    expect(queryWords("Is JUCO an option?")).toContain("njcaa")
  })
  it("sends the matching sections and not the others", () => {
    const d2 = pickSections(guides, "When can a D2 coach contact him?")
    expect(d2).toMatch(/Calls from June 15/)
    expect(d2).not.toMatch(/NIL means/)
    expect(pickSections(guides, "What is NIL?")).toMatch(/NIL means/)
    expect(pickSections(guides, "Does juco need a GPA?")).toMatch(/no minimum GPA/)
  })
  it("reads a whole guide by key", () => {
    expect(readGuide(guides, "learn:division-2")).toMatch(/Summary line[\s\S]*partial scholarship/)
    expect(readGuide(guides, "nope")).toMatch(/No guide/)
  })
})
