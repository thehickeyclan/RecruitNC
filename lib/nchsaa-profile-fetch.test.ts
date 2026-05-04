import { describe, expect, it } from "vitest"
import { parseFirstLastForNchsaa } from "@/lib/nchsaa-profile-fetch"

describe("parseFirstLastForNchsaa", () => {
  it("parses First Last", () => {
    expect(parseFirstLastForNchsaa("Ryan Thompson")).toEqual({ first: "Ryan", last: "Thompson" })
  })

  it("uses first and last token for middle names", () => {
    expect(parseFirstLastForNchsaa("Ryan M. Thompson")).toEqual({ first: "Ryan", last: "Thompson" })
  })

  it("parses Last, First", () => {
    expect(parseFirstLastForNchsaa("Thompson, Ryan")).toEqual({ first: "Ryan", last: "Thompson" })
    expect(parseFirstLastForNchsaa("Thompson, Ryan M.")).toEqual({ first: "Ryan", last: "Thompson" })
  })

  it("strips Jr./Sr. so last token is not Jr", () => {
    expect(parseFirstLastForNchsaa("Elias Smith Jr.")).toEqual({ first: "Elias", last: "Smith" })
    expect(parseFirstLastForNchsaa("Elias Smith Sr.")).toEqual({ first: "Elias", last: "Smith" })
    expect(parseFirstLastForNchsaa("Smith Jr., Elias")).toEqual({ first: "Elias", last: "Smith" })
  })

  it("strips generational suffix after first name in comma form", () => {
    expect(parseFirstLastForNchsaa("Smith, Elias Jr.")).toEqual({ first: "Elias", last: "Smith" })
  })

  it("returns null for single token", () => {
    expect(parseFirstLastForNchsaa("Elias")).toBeNull()
  })
})
