import { describe, expect, it } from "vitest"
import { PARTNERS, partnersSupporting, partnersWithLogos } from "./partners"

describe("partners", () => {
  it("names each partner once", () => {
    // Two lists previously held The Guild under two names; a partner added to one was invisible
    // on the other.
    const names = PARTNERS.map((p) => p.name.toLowerCase())
    expect(new Set(names).size).toBe(names.length)
    expect(new Set(PARTNERS.map((p) => p.id)).size).toBe(PARTNERS.length)
  })

  it("gives every partner alt text, and a real path when there is a logo", () => {
    for (const p of PARTNERS) {
      expect(p.logoAlt.length).toBeGreaterThan(2)
      if (p.logoSrc) expect(p.logoSrc.startsWith("/images/")).toBe(true)
    }
  })

  it("says what in-kind and major gifts actually gave", () => {
    // A logo says who; for a donated mat or a tray of bagels, the gift is the point.
    for (const p of PARTNERS) {
      if (p.support.includes("in-kind") || p.support.includes("major-gift")) {
        expect(p.gift && p.gift.length > 5).toBe(true)
      }
    }
  })

  it("keeps a logo-less supporter out of the logo grids", () => {
    expect(partnersWithLogos("in-kind").length).toBe(0)
    expect(partnersWithLogos("giving-hour").every((p) => Boolean(p.logoSrc))).toBe(true)
  })

  it("splits by what they support, and lets a partner do both", () => {
    expect(partnersSupporting("giving-hour").some((p) => p.id === "the-guild")).toBe(true)
    expect(partnersSupporting("corporate").some((p) => p.id === "the-guild")).toBe(true)
    expect(partnersSupporting("corporate").some((p) => p.id === "cronin-customs")).toBe(false)
  })

  it("allows a partner with no website", () => {
    expect(PARTNERS.some((p) => p.href === null)).toBe(true)
  })
})
