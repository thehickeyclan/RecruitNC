import { describe, expect, it } from "vitest"
import { isToc2026PreorderItem } from "./toc-preorder"

/** Any moment while the shirt was still being collected at the event. */
const DURING = Date.parse("2026-09-01T12:00:00-04:00")
const AFTER = Date.parse("2026-09-20T09:00:00-04:00")

describe("Tournament of Champions tee preorder detection", () => {
  it("detects cart items by SKU", () => {
    expect(isToc2026PreorderItem({ sku: "TOC26-TEE-NVY-L" }, DURING)).toBe(true)
  })

  it("detects catalog products before a size is selected", () => {
    expect(isToc2026PreorderItem({ slug: "2026-tournament-of-champions-tee" }, DURING)).toBe(true)
    expect(isToc2026PreorderItem({ name: "2026 Tournament of Champions Tee" }, DURING)).toBe(true)
  })

  it("does not mark other merchandise as a preorder", () => {
    expect(
      isToc2026PreorderItem({ slug: "first-in-flight-singlet", name: "First in Flight Singlet" }, DURING),
    ).toBe(false)
  })

  it("stops being a preorder once the tournament is over", () => {
    // Otherwise checkout keeps allowing only pickup at an event that has finished, which is a
    // shirt nobody can buy rather than a shirt that is sold out.
    expect(isToc2026PreorderItem({ sku: "TOC26-TEE-NVY-L" }, AFTER)).toBe(false)
    expect(isToc2026PreorderItem({ slug: "2026-tournament-of-champions-tee" }, AFTER)).toBe(false)
  })
})

describe("array callback safety", () => {
  it("is not fooled by an index arriving where the clock goes", () => {
    // `items.some(isToc2026PreorderItem)` would hand the callback index 0 as nowMs, which reads as
    // 1970 — i.e. the tournament has not happened — and quietly revives event-pickup-only checkout.
    const cart = [{ sku: "TOC26-TEE-NVY-L" }]
    expect(cart.some((item) => isToc2026PreorderItem(item))).toBe(false)
  })
})
