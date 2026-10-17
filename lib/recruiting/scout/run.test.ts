import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/recruiting/scout/tools", () => ({ SCOUT_TOOLS: [], runScoutTool: vi.fn() }))

import { draftProblems } from "@/lib/recruiting/scout/run"

describe("draftProblems", () => {
  it("catches praise, roster talk and a questionnaire not done", () => {
    expect(draftProblems("I'm interested because of its strong wrestling program.", false)).toHaveLength(1)
    expect(draftProblems("I noticed there might be room at my weight class soon.", false)).toHaveLength(1)
    expect(draftProblems("the opportunity to fill a spot at my weight class, with one wrestler in their final year", false)).toHaveLength(1)
    expect(draftProblems("I have completed the recruiting questionnaire on your website.", true)).toHaveLength(1)
    expect(draftProblems("I have completed the recruiting questionnaire on your website.", false)).toHaveLength(0)
  })
  it("leaves a plain, factual email alone", () => {
    expect(draftProblems("Two wrestlers from my school, Topsail, wrestle for you, and Buies Creek is two hours from home.", true)).toEqual([])
  })
})
