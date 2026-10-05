import { describe, expect, it } from "vitest"
import { conflict, corroborates, sameNameDifferentSpelling, type Identity } from "./identity-dedupe"

const id = (over: Partial<Identity> = {}): Identity => ({
  id: "x",
  canonical_name: "Someone",
  normalized_name: "someone",
  first_name: "someone",
  last_name: null,
  state: "NC",
  gender: "Male",
  graduation_year: null,
  athlete_id: null,
  first_seen_season: 2025,
  last_seen_season: 2025,
  evidence: {},
  ...over,
})

describe("sameNameDifferentSpelling", () => {
  it("spots a word the source truncated", () => {
    expect(sameNameDifferentSpelling("zoe-shal ahue bolosan", "zoe-shalom ahue bolosan")).toMatch(/truncated/)
    expect(sameNameDifferentSpelling("janessa fischer-cart", "janessa fischer-carter")).toMatch(/truncated/)
  })

  it("spots a middle name or a bracketed nickname", () => {
    expect(sameNameDifferentSpelling("angelia (aj) waren", "angelia waren")).toMatch(/middle name or nickname/)
    expect(sameNameDifferentSpelling("amber emily murray", "amber murray")).toMatch(/middle name or nickname/)
  })

  it("defers to the product's matcher for a nickname", () => {
    expect(sameNameDifferentSpelling("dom prosperi", "dominic prosperi")).toBeTruthy()
  })

  it("does not pair two different wrestlers", () => {
    expect(sameNameDifferentSpelling("franco pressley", "elijah pressley")).toBeNull()
    expect(sameNameDifferentSpelling("someone jones", "someone jones")).toBeNull()
  })

  it("will pair a surname that is merely a prefix — which is why corroboration is required", () => {
    // "Claire Ball" and "Claire Ballard" of NC are two girls. The name test cannot tell;
    // only the class years held them apart. A name signal alone must never merge.
    expect(sameNameDifferentSpelling("claire ball", "claire ballard")).toMatch(/truncated/)
  })
})

describe("corroborates", () => {
  it("accepts a shared school", () => {
    expect(
      corroborates(id({ evidence: { schools: ["Summerville"] } }), id({ evidence: { schools: ["summerville"] } })),
    ).toMatch(/same school/)
  })

  it("accepts a weight a wrestler could grow into", () => {
    expect(
      corroborates(
        id({ evidence: { weights: ["150"], seasons: [2025] } }),
        id({ evidence: { weights: ["157"], seasons: [2026] } }),
      ),
    ).toBeTruthy()
  })

  it("rejects a weight no one grows into, and seasons too far apart", () => {
    expect(
      corroborates(
        id({ evidence: { weights: ["106"], seasons: [2025] } }),
        id({ evidence: { weights: ["215"], seasons: [2026] } }),
      ),
    ).toBeNull()
  })

  it("rejects when there is nothing to corroborate with", () => {
    expect(corroborates(id(), id())).toBeNull()
  })
})

describe("conflict", () => {
  it("holds two different class years apart", () => {
    expect(conflict(id({ graduation_year: 2028 }), id({ graduation_year: 2027 }))).toMatch(/class years/)
  })

  it("holds two of our own profiles apart", () => {
    expect(conflict(id({ athlete_id: "a1" }), id({ athlete_id: "a2" }))).toMatch(/different profile/)
  })

  it("reads placing twice in one season at different weights as two wrestlers", () => {
    // Kai and Kainen Zimmerman of Oregon: one wrestler places once per season.
    const a = id({ evidence: { seasons: [2026], weights: ["126"] } })
    const b = id({ evidence: { seasons: [2026], weights: ["160"] } })
    expect(conflict(a, b)).toMatch(/both placed in 2026/)
  })

  it("allows one season at the same weight, which is one wrestler recorded twice", () => {
    const a = id({ evidence: { seasons: [2026], weights: ["126"] } })
    const b = id({ evidence: { seasons: [2026], weights: ["126"] } })
    expect(conflict(a, b)).toBeNull()
  })
})
