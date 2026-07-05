import { describe, expect, it } from "vitest"
import { matchesNchsaaDivisionFilter, matchesNchsaaGenderFilter } from "./nchsaa-year-results-gender"

describe("matchesNchsaaGenderFilter", () => {
  it("routes 2026 men to 1A/2A and 3A–8A men's weights", () => {
    expect(matchesNchsaaGenderFilter({ classification: "1A/2A", weight_class: "106" }, "men", 2026)).toBe(true)
    expect(matchesNchsaaGenderFilter({ classification: "8A", weight_class: "285" }, "men", 2026)).toBe(true)
    expect(matchesNchsaaGenderFilter({ classification: "1-4A", weight_class: "100" }, "men", 2026)).toBe(false)
  })

  it("routes 2026 women to 1-4A and 5A–8A women's weights", () => {
    expect(matchesNchsaaGenderFilter({ classification: "1-4A", weight_class: "100" }, "women", 2026)).toBe(true)
    expect(matchesNchsaaGenderFilter({ classification: "8A", weight_class: "235" }, "women", 2026)).toBe(true)
    expect(matchesNchsaaGenderFilter({ classification: "1A/2A", weight_class: "106" }, "women", 2026)).toBe(false)
  })

  it("splits shared 5A–8A by weight when gender column is absent", () => {
    expect(matchesNchsaaGenderFilter({ classification: "7A", weight_class: "144" }, "men", 2026)).toBe(true)
    expect(matchesNchsaaGenderFilter({ classification: "7A", weight_class: "144" }, "women", 2026)).toBe(false)
    expect(matchesNchsaaGenderFilter({ classification: "7A", weight_class: "145" }, "women", 2026)).toBe(true)
    expect(matchesNchsaaGenderFilter({ classification: "7A", weight_class: "145" }, "men", 2026)).toBe(false)
  })

  it("respects explicit gender column on shared classifications", () => {
    expect(
      matchesNchsaaGenderFilter(
        { classification: "8A", weight_class: "165", gender: "Female" },
        "women",
        2026,
      ),
    ).toBe(true)
    expect(
      matchesNchsaaGenderFilter(
        { classification: "8A", weight_class: "165", gender: "Male" },
        "women",
        2026,
      ),
    ).toBe(false)
  })
})

describe("matchesNchsaaDivisionFilter", () => {
  it("filters MOW/team division lists for 2026", () => {
    expect(matchesNchsaaDivisionFilter("3A", "men", 2026)).toBe(true)
    expect(matchesNchsaaDivisionFilter("3A", "women", 2026)).toBe(false)
    expect(matchesNchsaaDivisionFilter("1-4A", "women", 2026)).toBe(true)
    expect(matchesNchsaaDivisionFilter("8A", "men", 2026)).toBe(true)
    expect(matchesNchsaaDivisionFilter("8A", "women", 2026)).toBe(true)
  })
})
