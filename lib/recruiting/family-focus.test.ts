import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/coach-messages", () => ({ familyAthleteIds: async () => [] }))

import { focusFrom } from "./family-focus"

describe("whose recruiting a family is looking at", () => {
  it("follows a daughter to women's wrestling and a son to men's", () => {
    expect(focusFrom([{ firstName: "Ava", gender: "Female", graduationyear: 2028 }], 2026)).toEqual({ gender: "womens", names: ["Ava"] })
    expect(focusFrom([{ firstName: "Gavin", gender: "Male", graduationyear: 2029 }], 2026)).toEqual({ gender: "mens", names: ["Gavin"] })
  })

  it("sets nothing for a family with a son and a daughter", () => {
    expect(focusFrom([{ firstName: "Ava", gender: "Female", graduationyear: 2028 }, { firstName: "Gavin", gender: "Male", graduationyear: 2029 }], 2026)).toBeNull()
  })

  it("ignores a wrestler who has graduated", () => {
    expect(focusFrom([{ firstName: "Liam", gender: "Male", graduationyear: 2026 }, { firstName: "Ava", gender: "Female", graduationyear: 2028 }], 2026)).toEqual({ gender: "womens", names: ["Ava"] })
  })

  it("never guesses when a profile has no gender", () => {
    expect(focusFrom([{ firstName: "Sam", gender: null, graduationyear: 2028 }], 2026)).toBeNull()
    expect(focusFrom([], 2026)).toBeNull()
  })
})

import { parsePreview } from "./portal-viewer"

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }))
vi.mock("@/lib/ranking-access", () => ({ resolveRankingViewer: async () => ({ viewer: {}, userId: null }), resolveRankingViewerForUser: async () => ({ viewer: {}, userId: null }) }))

describe("the developer's family preview", () => {
  it("accepts only an account id, with or without the Blue flag", () => {
    expect(parsePreview("8d4ed89c-1a52-48cc-9429-ab5c24875a25")).toEqual({ userId: "8d4ed89c-1a52-48cc-9429-ab5c24875a25", blue: false })
    expect(parsePreview("8d4ed89c-1a52-48cc-9429-ab5c24875a25:blue")).toEqual({ userId: "8d4ed89c-1a52-48cc-9429-ab5c24875a25", blue: true })
    expect(parsePreview("someone@example.com")).toBeNull()
    expect(parsePreview(undefined)).toBeNull()
  })
})
