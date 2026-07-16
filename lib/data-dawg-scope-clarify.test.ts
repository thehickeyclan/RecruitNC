import { describe, expect, it } from "vitest"
import { getRouteForSuggestedPrompt } from "@/lib/data-dawg-suggested-prompts"
import { formatSuggestedHandlerAnswer } from "@/lib/data-dawg-suggested-handler-answer"
import {
  parseNhscaBestYearScopeFollowUp,
  tryNhscaBestYearScopeClarify,
} from "@/lib/data-dawg-scope-clarify"

describe("NHSCA best-year scope clarify", () => {
  it("routes typed all-americans / All Americans chip variants", () => {
    expect(getRouteForSuggestedPrompt("what was our best year for nhsca all-americans?")?.handler).toBe(
      "nhsca_all_american_count",
    )
    expect(getRouteForSuggestedPrompt("What was our best year for NHSCA All Americans")?.handler).toBe(
      "nhsca_all_american_count",
    )
  })

  it("asks statewide vs school when chat already has a school", () => {
    const clarify = tryNhscaBestYearScopeClarify("what was our best year for NHSCA All Americans", [
      {
        role: "assistant",
        content: "Here's what I found about Xavier Wilson:\n\nHigh School\nEastern Guilford\n\nNHSCA",
      },
    ])
    expect(clarify?.schoolHint).toBe("Eastern Guilford")
    expect(clarify?.answer).toContain("North Carolina overall")
    expect(clarify?.answer).toContain("Eastern Guilford")
  })

  it("does not clarify cold (no school in chat) — leave chip/statewide path", () => {
    expect(tryNhscaBestYearScopeClarify("what was our best year for nhsca all-americans?", [])).toBeNull()
  })

  it("parses 1/2 follow-ups after clarify", () => {
    const prior = [
      {
        role: "assistant" as const,
        content:
          "Quick check before I answer — do you mean:\n\n1. **North Carolina overall** — which year had the most NHSCA All-Americans statewide\n2. **Eastern Guilford** — that school’s best NHSCA All-American year\n\nReply with **1** or **2**.",
      },
    ]
    expect(parseNhscaBestYearScopeFollowUp("1", prior)).toBe("statewide")
    expect(parseNhscaBestYearScopeFollowUp("2", prior)).toBe("school")
    expect(parseNhscaBestYearScopeFollowUp("xavier wilson", prior)).toBeNull()
  })

  it("formats nhsca_all_american_count aggregate", () => {
    const text = formatSuggestedHandlerAnswer({
      aggregateResult: {
        type: "nhsca_all_american_count",
        bestYear: 2024,
        count: 40,
        bestMenYear: 2024,
        menCount: 38,
        bestWomenYear: 2026,
        womenCount: 12,
      },
    })
    expect(text).toContain("2024")
    expect(text).toContain("Best men’s year")
    expect(text).toContain("North Carolina")
  })
})
