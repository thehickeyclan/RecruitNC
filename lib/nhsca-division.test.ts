import { describe, expect, it } from "vitest"
import { nhscaDivision, nhscaLabel } from "./nhsca-division"

describe("nhscaDivision", () => {
  it("takes the row's division, then the event key", () => {
    expect(nhscaDivision("nhsca-nationals-2026", "Freshman")).toBe("Freshman")
    expect(nhscaDivision("nhsca-aa-sophomore-2024", null)).toBe("Sophomore")
    expect(nhscaDivision("nhsca-aa-middle-school-2025", null)).toBe("Middle School")
    expect(nhscaDivision("nhsca-nationals-2026", null)).toBe(null)
    expect(nhscaDivision("super32-2026", "Junior")).toBe("Junior")
    expect(nhscaDivision("fargo-2026-junior-fs", null)).toBe(null)
  })
  it("labels", () => {
    expect(nhscaLabel(2026, "Freshman")).toBe("2026 NHSCA freshman")
    expect(nhscaLabel(2026, "Junior", "title")).toBe("2026 NHSCA Junior")
    expect(nhscaLabel(2026, null)).toBe("2026 NHSCA")
  })
})
