import { describe, expect, it } from "vitest"

import { cleanReaction, passedBy, reactionsFor, theirLine, type ReactionRow } from "./reactions"
import { reactionSharing } from "./sharing"

const row = (over: Partial<ReactionRow> & { school_id: string }): ReactionRow => ({
  respondent: "parent",
  reaction: "not_for_us",
  reason: null,
  chips: [],
  sharing: "shared",
  created_at: "2026-11-05T10:00:00Z",
  ...over,
})

describe("reactions", () => {
  it("the latest reaction per side and college wins", () => {
    const v = reactionsFor("parent", [
      row({ school_id: "a", reaction: "maybe", created_at: "2026-11-05T11:00:00Z" }),
      row({ school_id: "a", reaction: "not_for_us", created_at: "2026-11-05T10:00:00Z" }),
    ])
    expect(v.mine.a.reaction).toBe("maybe")
  })

  it("a Cost pass reaches the other side as 'Not for us' with no reason", () => {
    const sharing = reactionSharing("not_for_us", "cost", "constraint")
    const v = reactionsFor("athlete", [row({ school_id: "a", reason: "cost", sharing })])
    expect(v.theirs.a).toEqual({ reaction: "not_for_us", reason: null, chips: [] })
    expect(theirLine("Your parent", v.theirs.a)).toBe("Your parent: Not for us")
    // The reactor still sees their own reason.
    expect(reactionsFor("parent", [row({ school_id: "a", reason: "cost", sharing })]).mine.a.reason).toBe("cost")
  })

  it("a Shared reason and keep chips reach the other side", () => {
    const v = reactionsFor("parent", [
      row({ school_id: "a", respondent: "athlete", reason: "too_far" }),
      row({ school_id: "b", respondent: "athlete", reaction: "closer_look", chips: ["close", "academics"] }),
    ])
    expect(theirLine("Gavin", v.theirs.a)).toBe("Gavin: Not for us · too far")
    expect(theirLine("Gavin", v.theirs.b)).toBe("Gavin: Worth a closer look · close, academics")
    expect(v.mine).toEqual({})
  })

  it("'Don't know it' is not a pass", () => {
    const v = reactionsFor("athlete", [
      row({ school_id: "a", respondent: "athlete", reason: "dont_know" }),
      row({ school_id: "b", respondent: "athlete", reason: "too_small" }),
      row({ school_id: "c", respondent: "athlete" }),
      row({ school_id: "d", respondent: "athlete", reaction: "maybe" }),
    ])
    expect([...passedBy(v.mine)].sort()).toEqual(["b", "c"])
    expect(theirLine("Gavin", v.mine.a)).toBe("Gavin: Doesn't know it yet")
  })

  it("only the other side's passes never count against this viewer", () => {
    const v = reactionsFor("athlete", [row({ school_id: "a", respondent: "parent", reason: "too_far" })])
    expect(passedBy(v.mine).size).toBe(0)
  })

  it("reasons only on a pass and chips only on a keep, from the offered lists", () => {
    expect(cleanReaction("not_for_us", "too_far", ["close"])).toEqual({ reason: "too_far", chips: [] })
    expect(cleanReaction("not_for_us", "made_up", [])).toEqual({ reason: null, chips: [] })
    expect(cleanReaction("closer_look", "too_far", ["close", "close", "nope"])).toEqual({ reason: null, chips: ["close"] })
    expect(cleanReaction("maybe", "cost", ["cost"])).toEqual({ reason: null, chips: [] })
  })

  it("lines never ask a question", () => {
    for (const r of ["too_far", "cost", "dont_know", null]) expect(theirLine("Your parent", { reaction: "not_for_us", reason: r, chips: [] })).not.toContain("?")
  })
})
