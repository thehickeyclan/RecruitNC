import { describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: async () => new Headers({ host: "app.ncwrestlingunited.com" }) }))

describe("the profile link a family hands a coach", () => {
  it("is RecruitWrestlers' for a wrestler outside North Carolina, NC United's for its NC families", async () => {
    const { shareableProfileUrl } = await import("@/lib/athlete-profile-links")
    expect(await shareableProfileUrl("a1", { state: "SC", is_nc_athlete: false })).toBe("https://www.recruitwrestlers.com/view-profile?id=a1")
    expect(await shareableProfileUrl("a2", { state: "NC", is_nc_athlete: true })).toBe("https://app.ncwrestlingunited.com/view-profile?id=a2")
  })
})
