import { describe, expect, it } from "vitest"
import { isCoachCutoverPath, safeNextPath } from "./coach-cutover"

describe("coach cutover", () => {
  it("hands across the portal pages, never auth, api or admin", () => {
    for (const p of ["/", "/my-recruits", "/coach-reports", "/public-rankings/2027", "/view-profile", "/inbox"]) expect(isCoachCutoverPath(p)).toBe(true)
    for (const p of ["/auth/signin", "/auth/rw-handoff", "/api/nav/new", "/admin/rankings/board", "/store", "/calendar"]) expect(isCoachCutoverPath(p)).toBe(false)
  })
  it("only continues to a path on the same site", () => {
    expect(safeNextPath("/my-recruits?x=1")).toBe("/my-recruits?x=1")
    expect(safeNextPath("//evil.com")).toBe("/my-recruits")
    expect(safeNextPath("https://evil.com")).toBe("/my-recruits")
    expect(safeNextPath("/auth/callback")).toBe("/my-recruits")
  })
})
