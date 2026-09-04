import { describe, expect, it } from "vitest"
import { DATA_DAWG_AGENT_V2_SYSTEM } from "./system-prompt"

/**
 * The prompt is the only thing standing between a twelve-year-old and advice nobody should give
 * them. These assertions are not about wording — they exist so a future edit that trims the prompt
 * cannot quietly remove a guardrail.
 */
describe("training-question guardrails", () => {
  it("refuses weight cutting outright", () => {
    expect(DATA_DAWG_AGENT_V2_SYSTEM).toMatch(/never give weight-cutting/i)
    expect(DATA_DAWG_AGENT_V2_SYSTEM).toMatch(/NCHSAA/i)
  })

  it("refuses medical questions", () => {
    expect(DATA_DAWG_AGENT_V2_SYSTEM).toMatch(/never answer a medical question/i)
    expect(DATA_DAWG_AGENT_V2_SYSTEM).toMatch(/concussion/i)
  })

  it("says who is asking, so the model treats it as advice to a child", () => {
    expect(DATA_DAWG_AGENT_V2_SYSTEM).toMatch(/eleven and eighteen/i)
  })

  it("still lets it answer training questions rather than refusing them", () => {
    expect(DATA_DAWG_AGENT_V2_SYSTEM).toMatch(/you should answer them/i)
  })

  it("defers to the wrestler's own coach", () => {
    expect(DATA_DAWG_AGENT_V2_SYSTEM).toMatch(/past your coach/i)
  })
})
