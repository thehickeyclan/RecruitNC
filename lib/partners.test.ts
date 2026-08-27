import { describe, expect, it } from "vitest"
import { PARTNERS, partnersSupporting } from "./partners"

describe("partners", () => {
  it("names each partner once", () => {
    // Two lists previously held The Guild under two names; a partner added to one was invisible
    // on the other.
    const names = PARTNERS.map((p) => p.name.toLowerCase())
    expect(new Set(names).size).toBe(names.length)
    expect(new Set(PARTNERS.map((p) => p.id)).size).toBe(PARTNERS.length)
  })

  it("gives every partner a logo and alt text", () => {
    for (const p of PARTNERS) {
      expect(p.logoSrc.startsWith("/images/")).toBe(true)
      expect(p.logoAlt.length).toBeGreaterThan(2)
    }
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
