import { describe, expect, it } from "vitest"
import { isWrestlingCommitment, resolveCommitmentCollege } from "@/lib/college-commitments/college"
import { commitmentCredential, shortCollegeName } from "@/lib/college-commitments/credential"

describe("the college a commitment names", () => {
  it("resolves to our own program data, so division and conference are not free text", () => {
    const out = resolveCommitmentCollege("NC State")
    expect(out.resolved).toBe(true)
    expect(out.name).toBe("North Carolina State University (NC State)")
    expect(out.division).toMatch(/Division I/)
  })

  it("folds the spellings a recruiting writer uses", () => {
    /* A state suffix, an abbreviated State, and a juco without its Community. */
    expect(resolveCommitmentCollege("Lehigh (PA)").name).toMatch(/Lehigh/)
    expect(resolveCommitmentCollege("Grand Valley St. (MI)").name).toBe("Grand Valley State University")
    expect(resolveCommitmentCollege("Iowa Lakes").name).toBe("Iowa Lakes Community College")
    expect(resolveCommitmentCollege("Army West Point").name).toMatch(/Military Academy/)
  })

  it("keeps a name it cannot place rather than guessing which school was meant", () => {
    /* "Penn" is three different schools; a wrong one is worse on a profile than a raw string. */
    const out = resolveCommitmentCollege("Some College We Do Not Hold")
    expect(out.resolved).toBe(false)
    expect(out.name).toBe("Some College We Do Not Hold")
  })

  it("knows what is not a wrestling commitment", () => {
    /* Flo's women's list answers "what next" in this column, and one answer is Not Competing. */
    expect(isWrestlingCommitment("Not Competing")).toBe(false)
    expect(isWrestlingCommitment("Cal Poly - Track & Field")).toBe(false)
    expect(isWrestlingCommitment("Cornell")).toBe(true)
  })
})

describe("a commitment as an opponent credential", () => {
  it("says it the way a coach would", () => {
    expect(commitmentCredential("North Carolina State University (NC State)")).toBe("NC State commit")
    expect(commitmentCredential("Southwestern Oregon Community College")).toBe("Southwestern Oregon commit")
    expect(commitmentCredential("Commonwealth University-Lock Haven (Lock Haven)")).toBe("Lock Haven commit")
    expect(shortCollegeName("University of Pennsylvania (Penn)")).toBe("Penn")
  })
})
