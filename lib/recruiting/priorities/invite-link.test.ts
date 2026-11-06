import { beforeAll, describe, expect, it } from "vitest"

import { createInviteToken, joinState, verifyInviteToken } from "./invite-link"

const A = "e3adf8cf-e81c-4e0f-a159-b30f6200a0b9"
const B = "0b0b0b0b-e81c-4e0f-a159-b30f6200a0b9"
beforeAll(() => {
  process.env.PRIORITIES_INVITE_SECRET = "test-secret"
})

describe("invite link", () => {
  it("opens for the wrestler it names and nobody else", () => {
    const t = createInviteToken(A)
    expect(verifyInviteToken(A, t)).toBe(true)
    expect(verifyInviteToken(B, t)).toBe(false)
    expect(verifyInviteToken(A, t.replace(/.$/, (c) => (c === "A" ? "B" : "A")))).toBe(false)
    expect(verifyInviteToken(A, "")).toBe(false)
  })
  it("expires after 14 days", () => {
    const t = createInviteToken(A, Date.now() - 15 * 86_400_000)
    expect(verifyInviteToken(A, t)).toBe(false)
  })
})

describe("join page rules", () => {
  const base = { validLink: true, userId: "kid", relationship: "self" as const, linkedParent: false, claimedBy: null }
  it("a wrestler account and a free profile: ready", () => expect(joinState(base)).toBe("ready"))
  it("a bad link says nothing else", () => expect(joinState({ ...base, validLink: false })).toBe("invalid"))
  it("signed out: make or sign in to an account", () => expect(joinState({ ...base, userId: null })).toBe("sign_in"))
  it("a parent can never answer the athlete set through the link", () => {
    expect(joinState({ ...base, userId: "mom", relationship: "parent" })).toBe("parent_account")
    expect(joinState({ ...base, userId: "mom", relationship: null, linkedParent: true })).toBe("parent_account")
    // Even a linked parent who owns the profile from an old claim.
    expect(joinState({ ...base, userId: "mom", relationship: "parent", linkedParent: true, claimedBy: "mom" })).toBe("parent_account")
  })
  it("a fan or coach account is not the wrestler's own", () => expect(joinState({ ...base, relationship: null })).toBe("parent_account"))
  it("the wrestler already owns it: straight on", () => expect(joinState({ ...base, claimedBy: "kid" })).toBe("already_yours"))
  it("someone else owns it: no takeover", () => expect(joinState({ ...base, claimedBy: "other" })).toBe("claimed_by_other"))
})
