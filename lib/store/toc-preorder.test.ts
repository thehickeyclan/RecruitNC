import { describe, expect, it } from "vitest"
import { isToc2026PreorderItem } from "./toc-preorder"

describe("Tournament of Champions tee preorder detection", () => {
  it("detects cart items by SKU", () => {
    expect(isToc2026PreorderItem({ sku: "TOC26-TEE-NVY-L" })).toBe(true)
  })

  it("detects catalog products before a size is selected", () => {
    expect(isToc2026PreorderItem({ slug: "2026-tournament-of-champions-tee" })).toBe(true)
    expect(isToc2026PreorderItem({ name: "2026 Tournament of Champions Tee" })).toBe(true)
  })

  it("does not mark other merchandise as a preorder", () => {
    expect(isToc2026PreorderItem({ slug: "first-in-flight-singlet", name: "First in Flight Singlet" })).toBe(false)
  })
})
