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
      if (p.logoSrc) expect(/^(\/images\/|https:\/\/)/.test(p.logoSrc)).toBe(true)
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
    // The grids may only contain what they can draw; the named lists carry the rest.
    for (const kind of ["giving-hour", "corporate", "in-kind", "major-gift"] as const) {
      expect(partnersWithLogos(kind).every((p) => Boolean(p.logoSrc))).toBe(true)
      const logoless = partnersSupporting(kind).filter((p) => !p.logoSrc).map((p) => p.id)
      expect(partnersWithLogos(kind).some((p) => logoless.includes(p.id))).toBe(false)
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

describe("nobody is invisible", () => {
  it("shows every supporter somewhere on the page", () => {
    // Pathos supported the Giving Hour with no logo file and fell straight through: that section
    // rendered only the partners it could show a logo for.
    const rendered = new Set([
      ...partnersWithLogos("giving-hour").map((p) => p.id),
      ...partnersSupporting("giving-hour").filter((p) => !p.logoSrc).map((p) => p.id),
      ...partnersWithLogos("corporate").map((p) => p.id),
      ...partnersSupporting("in-kind").map((p) => p.id),
      ...partnersSupporting("major-gift").map((p) => p.id),
    ])
    const missing = PARTNERS.filter((p) => !rendered.has(p.id)).map((p) => p.name)
    expect(missing).toEqual([])
  })

  it("gives every supporter at least one kind of support", () => {
    expect(PARTNERS.filter((p) => p.support.length === 0)).toEqual([])
  })
})

describe("gift descriptions survive a logo", () => {
  it("keeps the gift recorded even once a supporter has a logo", () => {
    // Adding adidas's logo moved them into the grid, which rendered name only — so "headgear and
    // backpacks" vanished. The data must keep it whatever the page chooses to draw.
    const adidas = PARTNERS.find((p) => p.id === "adidas-wrestling")
    expect(adidas?.logoSrc).toBeTruthy()
    expect(adidas?.gift).toContain("Headgear")
    const pathos = PARTNERS.find((p) => p.id === "pathos")
    expect(pathos?.gift).toContain("Socks")
  })
})

describe("logos that need inverting on the black tiles", () => {
  it("marks the Pathos wordmark, which is black on transparent", () => {
    expect(PARTNERS.find((p) => p.id === "pathos")?.logoInvertsOnDark).toBe(true)
  })

  it("leaves colour logos alone, so a brand's palette is never reversed", () => {
    const inverted = PARTNERS.filter((p) => p.logoInvertsOnDark).map((p) => p.id)
    expect(inverted).toEqual(["pathos"])
  })
})
