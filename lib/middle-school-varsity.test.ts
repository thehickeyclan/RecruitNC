import { describe, expect, it } from "vitest"
import { allowsMiddleSchoolVarsity, isIndependentChampionship, isIndependentClassification } from "./athlete-state"

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

  it("allows it in a state association's own independent-school division", () => {
    /*
     * Tennessee's TSSAA Division II is McCallie, Baylor, MBA, Brentwood Academy and Knoxville
     * Catholic. Those rows carry association "TSSAA" - the same string as the public divisions -
     * so only the classification tells them apart, and 13 of 504 DII placements sit before the
     * wrestler's freshman year against 0 of AA's 672.
     */
    expect(allowsMiddleSchoolVarsity("TN", "TSSAA", "DII")).toBe(true)
    expect(isIndependentClassification("TN", "DII")).toBe(true)
  })

  it("refuses the public divisions of that same association", () => {
    expect(allowsMiddleSchoolVarsity("TN", "TSSAA", "AA")).toBe(false)
    expect(allowsMiddleSchoolVarsity("TN", "TSSAA", "A")).toBe(false)
    expect(allowsMiddleSchoolVarsity("TN", "TSSAA", "Girls")).toBe(false)
    expect(allowsMiddleSchoolVarsity("TN", "TSSAA")).toBe(false)
  })

  it("does not let one state's independent classification travel", () => {
    expect(allowsMiddleSchoolVarsity("NC", "NCHSAA", "DII")).toBe(false)
    expect(isIndependentClassification("NC", "DII")).toBe(false)
  })

  it("refuses an unregistered state and a blank association", () => {
    expect(allowsMiddleSchoolVarsity("ZZ", "ZZHSAA")).toBe(false)
    expect(allowsMiddleSchoolVarsity(null, null)).toBe(false)
  })
})
