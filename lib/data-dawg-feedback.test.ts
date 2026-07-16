import { describe, expect, it } from "vitest"
import {
  findDataDawgFeedbackContextFromMessages,
  parseHeyDataDawgChatFeedback,
  stripHeyDataDawgGreeting,
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

  it("answers questions that open with the greeting instead of filing them", () => {
    // The welcome copy teaches "Hey Data Dawg, …", so real questions arrive this way.
    for (const q of [
      "Hey Data Dawg, who won 4A state at 132?",
      "Hey Data Dawg, show me Cam Stinson",
      "Hey Data Dawg, which school has the most NHSCA All-Americans?",
      "Hey Data Dawg, what's Liam Hickey's record?",
      "Hey Data Dawg, is Cam Stinson committed anywhere?",
      "Hey Data Dawg, list the 2024 NCHSAA champions",
      "Hey Data Dawg, Fargo results 2026?",
    ]) {
      expect(parseHeyDataDawgChatFeedback(q), q).toBeNull()
    }
  })

  it("still files corrections, including question-shaped ones", () => {
    expect(
      parseHeyDataDawgChatFeedback("Hey Data Dawg, Cam Stinson placed 3rd at NHSCA 2025, not 5th, right?"),
    ).toEqual({ correctionNotes: "Cam Stinson placed 3rd at NHSCA 2025, not 5th, right?" })

    expect(parseHeyDataDawgChatFeedback("Hey Data Dawg, his weight class is wrong")).toEqual({
      correctionNotes: "his weight class is wrong",
    })

    // "should" must not read as a question lead.
    expect(parseHeyDataDawgChatFeedback("Hey Data Dawg, should be 3rd not 5th")).toEqual({
      correctionNotes: "should be 3rd not 5th",
    })

    // A bare statement of fact with no question signal stays a correction.
    expect(parseHeyDataDawgChatFeedback("Hey Data Dawg, Tobin McNair transferred to Cardinal Gibbons")).toEqual({
      correctionNotes: "Tobin McNair transferred to Cardinal Gibbons",
    })
  })
})

describe("stripHeyDataDawgGreeting", () => {
  it("strips the greeting so fast-path routing sees the bare question", () => {
    expect(stripHeyDataDawgGreeting("Hey Data Dawg, who won 4A state at 132?")).toBe(
      "who won 4A state at 132?",
    )
    expect(stripHeyDataDawgGreeting("hey data dawg: show Fargo results 2026")).toBe(
      "show Fargo results 2026",
    )
  })

  it("leaves other messages untouched", () => {
    expect(stripHeyDataDawgGreeting("Who are the 4x state champions?")).toBe(
      "Who are the 4x state champions?",
    )
  })

  it("falls back to the original when nothing follows the greeting", () => {
    expect(stripHeyDataDawgGreeting("Hey Data Dawg")).toBe("Hey Data Dawg")
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
