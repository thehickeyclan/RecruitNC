import { describe, expect, it } from "vitest"
import { normalizeClub } from "./normalize-club"

describe("normalizeClub", () => {
  it("keeps a real club, trimmed", () => {
    expect(normalizeClub("Darkhorse")).toBe("Darkhorse")
    expect(normalizeClub("  Fear This ")).toBe("Fear This")
  })

  it("treats missing and blank as no club, so the slot reads Unaffiliated rather than nothing", () => {
    expect(normalizeClub(null)).toBeNull()
    expect(normalizeClub(undefined)).toBeNull()
    expect(normalizeClub("")).toBeNull()
    expect(normalizeClub("   ")).toBeNull()
  })

  it("treats a typed-in placeholder as no club, including the misspelling on file", () => {
    for (const placeholder of ["Unafilliated", "Unaffiliated", "unaffiliated", "N/A", "none", "-", "Unattached"]) {
      expect(normalizeClub(placeholder), placeholder).toBeNull()
    }
  })

  it("does not swallow a club whose name merely contains a placeholder word", () => {
    expect(normalizeClub("Independence Wrestling")).toBe("Independence Wrestling")
    expect(normalizeClub("None Better WC")).toBe("None Better WC")
  })
})
