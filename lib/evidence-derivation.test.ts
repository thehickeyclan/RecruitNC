import { describe, expect, it } from "vitest"
import { evidenceContradictsItself } from "./evidence-derivation"

/**
 * A wrestler printed a grade in the season ENDING in a given year graduates on a fixed offset.
 * Virginia's first discovery pass read USA Wrestling's 2023-24 champions list as the 2024-25
 * season, so 17 of its 45 champion years were a year late. These are the real strings, from the
 * pass and from its correction.
 */
describe("an export row's evidence must soundly derive the year it claims", () => {
  it("catches the 2023-24 champions list read as a year later", () => {
    const ev =
      "USA Wrestling 2023-24 champions list (final ed., Feb 27, 2024) print: " +
      "'132 - Brody Coleman (Grundy) 18-5, Jr.' in 2024 -> class of 2026."
    expect(evidenceContradictsItself(ev, 2026)).toMatch(/graduates 2025, but that derivation says 2026/)
  })

  it("accepts a correction that quotes the mistake it is correcting", () => {
    // The whole reason the rule is "one sound derivation supports the claim" and not "every
    // derivation is sound": this string contains both the corrected arithmetic and the old error.
    const ev =
      "CORRECTION (2026-11-04) of VA-discovery1-resolutions.csv: the original row derived class of " +
      "2026 from the USA Wrestling 2023-24 champions list print (Jr. in the season ending 2024). " +
      "That list is the 2023-24 season (final ed. Feb 27, 2024): Jr. in 2024 derives class of 2025, " +
      "not 2026. Original evidence: USA Wrestling 2023-24 champions list (final ed., Feb 27, 2024) " +
      "print: '132 - Brody Coleman (Grundy) 18-5, Jr.' in 2024 -> class of 2026."
    expect(evidenceContradictsItself(ev, 2025)).toBeNull()
  })

  it("still refuses that same correction string if the row claims the old wrong year", () => {
    const ev =
      "That list is the 2023-24 season: Jr. in 2024 derives class of 2025, not 2026. " +
      "Original evidence: '132 - Brody Coleman (Grundy) 18-5, Jr.' in 2024 -> class of 2026."
    expect(evidenceContradictsItself(ev, 2026)).toMatch(/graduates 2025, but that derivation says 2026/)
  })

  it("reads the reconciliation exports' own format", () => {
    const good = "IA-grad-years — 2024: HS Junior -> 2025 (IHSAA 11731425) | 2025: HS Senior -> 2025 (IHSAA 13018656)"
    expect(evidenceContradictsItself(good, 2025)).toBeNull()
    const bad = "AR-grad-years-final — 2025: HS Sophomore -> 2026 (AAA 12908085)"
    expect(evidenceContradictsItself(bad, 2026)).toMatch(/graduates 2027/)
  })

  it("flags a row whose evidence is sound but derives a different year", () => {
    const ev = "2026: HS Senior -> 2026 (AAA 14927340)"
    expect(evidenceContradictsItself(ev, 2027)).toMatch(/soundly derives 2026 but the row claims 2027/)
  })

  it("says nothing about evidence that states no derivation", () => {
    expect(evidenceContradictsItself("roster page, no grade printed", 2027)).toBeNull()
    expect(evidenceContradictsItself("", 2027)).toBeNull()
  })

  it("handles every grade, long and short", () => {
    for (const [grade, off] of [["Fr", 3], ["So", 2], ["Jr", 1], ["Sr", 0]] as const) {
      expect(evidenceContradictsItself(`2026: HS ${grade} -> ${2026 + off}`, 2026 + off)).toBeNull()
      expect(evidenceContradictsItself(`2026: HS ${grade} -> ${2026 + off + 1}`, 2026 + off + 1)).not.toBeNull()
    }
    for (const [grade, off] of [["Freshman", 3], ["Sophomore", 2], ["Junior", 1], ["Senior", 0]] as const) {
      expect(evidenceContradictsItself(`2025: HS ${grade} -> ${2025 + off}`, 2025 + off)).toBeNull()
    }
  })

  it("does not read a bare year as a derivation", () => {
    expect(evidenceContradictsItself("placed 2024, 2025 and 2026; class of 2027", 2027)).toBeNull()
  })
})
