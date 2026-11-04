import { describe, expect, it } from "vitest"
import { allowsMiddleSchoolVarsity, isIndependentChampionship } from "./athlete-state"

/*
 * A 7th or 8th grade state placement is either ordinary or evidence of a namesake, and which one
 * depends on the championship. Minnesota made the distinction matter: the MSHSL lets middle-
 * schoolers wrestle varsity, so 69 legitimate placements failed the readiness gate as namesakes.
 * The fix must NOT be to call the MSHSL independent - public schools are not independent schools,
 * and `isIndependentChampionship` is read elsewhere.
 */
describe("allowsMiddleSchoolVarsity", () => {
  it("allows it in a state association that permits it", () => {
    expect(allowsMiddleSchoolVarsity("MN", "MSHSL")).toBe(true)
  })

  it("does not call that association independent", () => {
    expect(isIndependentChampionship("MN", "MSHSL")).toBe(false)
  })

  it("allows it at independent schools, which roster middle-schoolers", () => {
    expect(allowsMiddleSchoolVarsity("NC", "NCISA")).toBe(true)
    expect(allowsMiddleSchoolVarsity("SC", "SCISA")).toBe(true)
    expect(allowsMiddleSchoolVarsity("VA", "VISAA")).toBe(true)
  })

  it("refuses it in a public association that does not permit it", () => {
    expect(allowsMiddleSchoolVarsity("NC", "NCHSAA")).toBe(false)
    expect(allowsMiddleSchoolVarsity("VA", "VHSL")).toBe(false)
    expect(allowsMiddleSchoolVarsity("SC", "SCHSL")).toBe(false)
  })

  it("does not leak the permission to another state's association filed under it", () => {
    expect(allowsMiddleSchoolVarsity("MN", "NCHSAA")).toBe(false)
    expect(allowsMiddleSchoolVarsity("MN", "")).toBe(false)
  })

  it("refuses an unregistered state and a blank association", () => {
    expect(allowsMiddleSchoolVarsity("ZZ", "ZZHSAA")).toBe(false)
    expect(allowsMiddleSchoolVarsity(null, null)).toBe(false)
  })
})
