import { describe, expect, it } from "vitest"
import { digestBody, digestTitle, firstName, ordinal } from "./result-digest-message"

describe("ordinal", () => {
  it("uses the right suffix for the ones that trip people up", () => {
    expect(ordinal(1)).toBe("1st")
    expect(ordinal(2)).toBe("2nd")
    expect(ordinal(3)).toBe("3rd")
    expect(ordinal(4)).toBe("4th")
    expect(ordinal(8)).toBe("8th")
  })

  it("keeps the teens on 'th' rather than reading 11st", () => {
    expect(ordinal(11)).toBe("11th")
    expect(ordinal(12)).toBe("12th")
    expect(ordinal(13)).toBe("13th")
  })

  it("handles the twenties, where the pattern starts again", () => {
    expect(ordinal(21)).toBe("21st")
    expect(ordinal(22)).toBe("22nd")
    expect(ordinal(23)).toBe("23rd")
  })
})

describe("firstName", () => {
  it("takes the first word", () => {
    expect(firstName("Marcus Cherry")).toBe("Marcus")
  })

  it("leaves a single name alone", () => {
    expect(firstName("Cherry")).toBe("Cherry")
  })

  it("survives the padding that comes out of imported data", () => {
    expect(firstName("  Elias   Marquez Flores ")).toBe("Elias")
  })
})

describe("digestBody", () => {
  it("names the best finish among the wrestlers this account follows", () => {
    expect(digestBody({ count: 4, best: { name: "Marcus Cherry", place: 3 } })).toBe(
      "4 wrestlers you follow competed. Marcus placed 3rd.",
    )
  })

  it("stays singular for one wrestler", () => {
    expect(digestBody({ count: 1, best: { name: "Jack Harty", place: 1 } })).toBe(
      "1 wrestler you follow competed. Jack placed 1st.",
    )
  })

  it("claims no placement when none is on file", () => {
    const body = digestBody({ count: 2, best: null })
    expect(body).toBe("2 wrestlers you follow competed.")
    expect(body).not.toMatch(/placed/)
  })
})

describe("digestTitle", () => {
  it("reads as the event, because that is what the reader recognises", () => {
    expect(digestTitle("Journeymen")).toBe("Journeymen results are in")
  })
})
