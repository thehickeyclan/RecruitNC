import { describe, expect, it } from "vitest"
import { formatOpenAiHttpError, toDataDawgUserFacingError } from "@/lib/openai-user-facing-error"

describe("toDataDawgUserFacingError", () => {
  const leaky = [
    formatOpenAiHttpError(401, JSON.stringify({ error: { code: "invalid_api_key" } })),
    formatOpenAiHttpError(429, JSON.stringify({ error: { code: "insufficient_quota" } })),
    formatOpenAiHttpError(500, JSON.stringify({ error: { message: "upstream exploded" } })),
    "OPENAI_API_KEY missing",
    "connect ECONNREFUSED 10.0.0.1:5432",
  ]

  it("never leaks operator detail into the chat bubble", () => {
    for (const operatorMessage of leaky) {
      const shown = toDataDawgUserFacingError(operatorMessage)
      expect(shown, operatorMessage).not.toMatch(/OPENAI_API_KEY|api key|billing|vercel|\.env|https?:\/\/|HTTP \d|ECONNREFUSED/i)
    }
  })

  it("tells the user to wait when we are rate limited", () => {
    const shown = toDataDawgUserFacingError(formatOpenAiHttpError(429, JSON.stringify({ error: { code: "rate_limit_exceeded" } })))
    expect(shown).toMatch(/lot of questions/i)
    expect(shown).not.toMatch(/OpenAI|concurrent/i)
  })

  it("falls back to a generic retry message for everything else", () => {
    expect(toDataDawgUserFacingError("connect ECONNREFUSED")).toMatch(/try again in a moment/i)
  })
})
