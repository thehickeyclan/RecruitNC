import { describe, expect, it } from "vitest"
import { nameKeys, nameMatch } from "./name-variants"

describe("nameMatch", () => {
  it("joins the Super 32 names South Carolina's profiles missed", () => {
    expect(nameMatch("Maximiliano Johnson", "Max Johnson")).toBe("variant")
    expect(nameMatch("Alexander Mestas", "Alex Mestas")).toBe("variant")
    expect(nameMatch("Andrew Lawson", "Andrew P Lawson")).toBe("variant")
    expect(nameMatch("Tyrone Norris III", "Tyrone Norris")).toBe("variant")
    expect(nameMatch("Billy Williams jr.", "Billy Williams")).toBe("variant")
    expect(nameMatch("Colton Campbell", "Colt Campbell")).toBe(null) // prefix, not a nickname pair: left to review
  })
  it("calls the same spelling exact", () => {
    expect(nameMatch("Max Johnson", "max  johnson")).toBe("exact")
    expect(nameMatch("D'Ettore Smith", "D?Ettore Smith")).toBe("exact")
  })
  it("never joins different people", () => {
    expect(nameMatch("Jahiem Skyers", "Rahiem Skyers")).toBe(null)
    expect(nameMatch("Drayton Johnson", "Max Johnson")).toBe(null)
    expect(nameMatch("Cayden Dover", "Isaiah Dover")).toBe(null)
    expect(nameMatch("Ryley Williams", "Billy Williams")).toBe(null)
  })
  it("keeps a two-part name whose second part looks like a suffix", () => {
    expect(nameKeys("Ian V")).toEqual(["ian v"])
  })
})
