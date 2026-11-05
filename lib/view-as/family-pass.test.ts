import { describe, expect, it } from "vitest"
import { makeFamilyPass, readFamilyPass } from "./family-pass"

process.env.VIEW_AS_SECRET = "test-secret"
const fam = "a54686bd-d4f3-4891-8311-63c67d528f0d"
const me = "62fd1444-78b7-4846-b507-13c07af7b9d7"

describe("family pass", () => {
  it("reads back for the same account", () => {
    expect(readFamilyPass(makeFamilyPass(fam, me, "business"), me)).toEqual({ familyId: fam, role: "business" })
  })
  it("refuses another account, a changed role, or a forged pass", () => {
    const pass = makeFamilyPass(fam, me, "business")
    expect(readFamilyPass(pass, fam)).toBeNull()
    expect(readFamilyPass(pass.replace(".business.", ".admin."), me)).toBeNull()
    expect(readFamilyPass(fam, me)).toBeNull()
    expect(readFamilyPass(undefined, me)).toBeNull()
  })
})
