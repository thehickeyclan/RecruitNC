import { describe, expect, it } from "vitest"
import { familyFromMetadata } from "./account-family"

const fam = "a54686bd-d4f3-4891-8311-63c67d528f0d"
describe("account family", () => {
  it("reads the family for a business account", () => {
    expect(familyFromMetadata({ business_access: true, view_as_family: fam })).toBe(fam)
  })
  it("ignores it without the business grant, or when it is not an id", () => {
    expect(familyFromMetadata({ view_as_family: fam })).toBeNull()
    expect(familyFromMetadata({ business_access: true, view_as_family: "x" })).toBeNull()
    expect(familyFromMetadata(null)).toBeNull()
  })
})
