import { describe, expect, it } from "vitest"
import { classificationStrengthPoints, scoreNchsaaRowsForSeed } from "./ai-seeding"

describe("state classification strength", () => {
  it("leaves North Carolina's ladder exactly as it was", () => {
    expect(["8A", "7A", "6A", "5A", "4A", "3A", "1A/2A", "NCISA"].map((c) => classificationStrengthPoints(c))).toEqual([25, 20, 10, 6, 3, 1, 0, 0])
  })

  it("scores South Carolina's tiers by place from the top: 5A as 8A, 4A as 7A, 3A as 6A, 2A/1A as 5A", () => {
    expect(["5A", "4A", "3A", "2A/1A", "1A/2A"].map((c) => classificationStrengthPoints(c, "SCHSL"))).toEqual([25, 20, 10, 6, 6])
  })

  it("scores SCISA as NCISA: nothing for classification", () => {
    expect(classificationStrengthPoints("SCISA", "SCISA")).toBe(0)
  })

  it("an SC 5A title scores like an NC 8A title", () => {
    const sc = scoreNchsaaRowsForSeed([{ year: 2026, classification: "5A", weight_class: "150", place: 1, school: "", wrestler_name: "", association: "SCHSL" }])
    const nc = scoreNchsaaRowsForSeed([{ year: 2026, classification: "8A", weight_class: "150", place: 1, school: "", wrestler_name: "" }])
    expect(sc).toBe(nc)
  })
})
