import { describe, expect, it } from "vitest"
import {
  computeAiQuerySuccess,
  isAiQueryLogsTableMissingError,
  isLearningOpportunityHandler,
  truncateAiResponse,
} from "@/lib/ai-query-logs"

describe("ai-query-logs helpers", () => {
  it("detects missing table errors", () => {
    expect(isAiQueryLogsTableMissingError({ code: "42P01" })).toBe(true)
    expect(
      isAiQueryLogsTableMissingError({
        message: 'relation "public.ai_query_logs" does not exist',
      }),
    ).toBe(true)
    expect(isAiQueryLogsTableMissingError({ message: "permission denied for ai_query_logs" })).toBe(
      false,
    )
  })

  it("computes success from answer and error", () => {
    expect(computeAiQuerySuccess({ answer: "NC State" })).toBe(true)
    expect(computeAiQuerySuccess({ answer: "  ", errorMessage: null })).toBe(false)
    expect(computeAiQuerySuccess({ answer: "ok", errorMessage: "boom" })).toBe(false)
  })

  it("flags learning opportunity handlers", () => {
    expect(isLearningOpportunityHandler("llm_fallback")).toBe(true)
    expect(isLearningOpportunityHandler("data_dawg_agent_v2_error")).toBe(true)
    expect(isLearningOpportunityHandler("data_dawg_agent_v2")).toBe(false)
    expect(isLearningOpportunityHandler(null)).toBe(true)
  })

  it("truncates responses", () => {
    expect(truncateAiResponse("hi")).toBe("hi")
    expect(truncateAiResponse("x".repeat(1200))?.length).toBe(1000)
  })
})
