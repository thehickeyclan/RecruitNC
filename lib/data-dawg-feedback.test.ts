import { describe, expect, it } from "vitest"
import {
  findDataDawgFeedbackContextFromMessages,
  parseHeyDataDawgChatFeedback,
} from "@/lib/data-dawg-feedback"

describe("parseHeyDataDawgChatFeedback", () => {
  it("extracts correction after greeting", () => {
    expect(
      parseHeyDataDawgChatFeedback("Hey Data Dawg, Cam Stinson placed 3rd at NHSCA 2025, not 5th."),
    ).toEqual({
      correctionNotes: "Cam Stinson placed 3rd at NHSCA 2025, not 5th.",
    })
  })

  it("accepts punctuation variants", () => {
    expect(parseHeyDataDawgChatFeedback("hey data dawg: missing Super32 results")).toEqual({
      correctionNotes: "missing Super32 results",
    })
  })

  it("returns needsDetail when observation is too short", () => {
    expect(parseHeyDataDawgChatFeedback("Hey Data Dawg")).toEqual({ needsDetail: true })
    expect(parseHeyDataDawgChatFeedback("Hey Data Dawg, bad")).toEqual({ needsDetail: true })
  })

  it("returns null for normal questions", () => {
    expect(parseHeyDataDawgChatFeedback("Who are the 4x state champions?")).toBeNull()
  })
})

describe("findDataDawgFeedbackContextFromMessages", () => {
  it("uses the latest assistant turn and preceding user question", () => {
    const ctx = findDataDawgFeedbackContextFromMessages([
      { role: "user", content: "Cam Stinson NHSCA" },
      { role: "assistant", content: "No NHSCA results found.", messageId: "m1" },
      { role: "user", content: "Hey Data Dawg, he placed 3rd" },
    ])
    expect(ctx).toEqual({
      userQuery: "Cam Stinson NHSCA",
      assistantResponse: "No NHSCA results found.",
      messageId: "m1",
    })
  })
})
