import { describe, expect, it } from "vitest"
import { mergeTocConfirmedCollegeNames, resolveTocConfirmedColleges } from "@/lib/toc/confirmed-colleges"
import { TOC_CONFIRMED_COLLEGES_DEFAULT } from "@/lib/toc/constants"

describe("mergeTocConfirmedCollegeNames", () => {
  it("returns all code defaults when DB list is empty", () => {
    expect(mergeTocConfirmedCollegeNames([])).toEqual(
      TOC_CONFIRMED_COLLEGES_DEFAULT.map((c) => c.name),
    )
  })

  it("appends code defaults when DB only has the original five programs", () => {
    const merged = mergeTocConfirmedCollegeNames([
      "UNC",
      "NC State",
      "Roanoke",
      "Greensboro College",
      "Montreat",
    ])
    expect(merged).toContain("UMO")
    expect(merged).toContain("Lynchburg")
    expect(merged).toContain("UNC Pembroke")
    expect(merged.indexOf("UMO")).toBeGreaterThan(merged.indexOf("Montreat"))
  })

  it("keeps DB-only programs not in constants", () => {
    const merged = mergeTocConfirmedCollegeNames(["App State"])
    expect(merged[0]).toBe("UNC")
    expect(merged).toContain("App State")
  })
})

describe("resolveTocConfirmedColleges", () => {
  it("always returns full code default logos even when Supabase list is stale", async () => {
    const staleDb = ["UNC", "NC State", "Roanoke", "Greensboro College", "Montreat"]
    const colleges = await resolveTocConfirmedColleges(staleDb)
    const names = colleges.map((c) => c.name)
    expect(names).toContain("UMO")
    expect(names).toContain("Lynchburg")
    const umo = colleges.find((c) => c.name === "UMO")
    expect(umo?.logoUrl).toContain("cwjgktar-1745958885613")
    const lynchburg = colleges.find((c) => c.name === "Lynchburg")
    expect(lynchburg?.logoUrl).toContain("Lynchburg.jpg")
    const uncPembroke = colleges.find((c) => c.name === "UNC Pembroke")
    expect(uncPembroke?.logoUrl).toBe("/images/toc/unc-pembroke-braves-logo.png")
  })
})
