import { describe, expect, it } from "vitest"
import { parseAppHandoff, safeNextPath } from "./app-handoff"

describe("safeNextPath", () => {
  it("keeps a path on this site", () => {
    expect(safeNextPath("/view-profile?id=abc")).toBe("/view-profile?id=abc")
  })

  it("refuses anything that leaves the site", () => {
    for (const next of ["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "", null]) {
      expect(safeNextPath(next)).toBe("/")
    }
  })
})

describe("parseAppHandoff", () => {
  it("reads the token, the user and the destination", () => {
    const hash = `#t=abc123&u=user-1&next=${encodeURIComponent("/view-profile?id=x")}`
    expect(parseAppHandoff(hash)).toEqual({ tokenHash: "abc123", userId: "user-1", next: "/view-profile?id=x" })
  })

  it("is nothing without a token", () => {
    expect(parseAppHandoff("#next=/athletes")).toBeNull()
  })

  it("does not follow a destination off the site", () => {
    expect(parseAppHandoff("#t=abc&next=//evil.example")?.next).toBe("/")
  })
})
