import { describe, expect, it } from "vitest"
import { fundraisingDirectoryIdentityKey, ncuCodeGradYearSuffix } from "./fundraising-directory-identity"

describe("fundraisingDirectoryIdentityKey", () => {
  it("matches same wrestler with same school", () => {
    expect(
      fundraisingDirectoryIdentityKey("Jack Aponte", "Cardinal Gibbons", "a"),
    ).toBe(fundraisingDirectoryIdentityKey("Jack Aponte", "Cardinal Gibbons", "b"))
  })

  it("does not merge when school line missing (uses fallback)", () => {
    expect(fundraisingDirectoryIdentityKey("Pat Smith", null, "id-1")).not.toBe(
      fundraisingDirectoryIdentityKey("Pat Smith", null, "id-2"),
    )
  })
})

describe("ncuCodeGradYearSuffix", () => {
  it("reads grad year digits", () => {
    expect(ncuCodeGradYearSuffix("NCU-APONTE-31")).toBe(31)
    expect(ncuCodeGradYearSuffix("NCU-APONTE-30")).toBe(30)
  })
})
