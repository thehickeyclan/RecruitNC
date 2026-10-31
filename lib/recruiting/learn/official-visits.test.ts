import { describe, expect, it } from "vitest"

import { BEFORE_YOU_GO, limitsByLevel, TIMING, VISIT_CHECKLIST, VISIT_QUESTIONS, WHAT_IT_IS, WHO_PAYS_ROWS } from "./official-visits"

describe("official visit guide", () => {
  it("reads every fact from the library (a renamed heading fails here, not on the page)", () => {
    expect(WHAT_IT_IS).toMatch(/official visit is one the college pays for/)
    expect(BEFORE_YOU_GO).toHaveLength(4)
    expect(WHO_PAYS_ROWS.rows.length).toBeGreaterThanOrEqual(5)
    expect(TIMING.deadPeriod.text).toMatch(/dead period/)
    expect(VISIT_CHECKLIST.filter((c) => c.kind === "rule").every((c) => c.sources?.length)).toBe(true)
  })

  it("gives limits by level for each Division I track", () => {
    const boys = limitsByLevel("men-2028")
    expect(boys.map((l) => l.level)).toEqual(["Division I", "Division II", "Division III", "NAIA", "Junior college"])
    expect(boys[0].when).toBe("August 15 of senior year")
    expect(boys[0].limit).toBe("Official visits are unlimited overall, but one per school. A second to the same school is allowed after a head coaching change. Two nights at most.")
    expect(boys[1]).toMatchObject({ when: "June 15 immediately before junior year", limit: "one per school, 48 hours at most" })
    expect(limitsByLevel("women")[0].when).toBe("August 1 of junior year")
  })

  it("asks questions, each one a sentence", () => {
    const all = VISIT_QUESTIONS.flatMap((g) => g.questions)
    expect(all.length).toBeGreaterThanOrEqual(7)
    for (const q of all) expect(q).toMatch(/[.?]$/)
  })
})
