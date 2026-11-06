import { describe, expect, it, vi } from "vitest"
vi.mock("server-only", () => ({}))
import { zipPoint } from "./zip-point"
import { US_ZIP_POINTS } from "./us-zip-points"

describe("zipPoint", () => {
  it("knows NC and out-of-state ZIPs", () => {
    expect(zipPoint("27601")).toEqual([35.77, -78.63]) // Raleigh
    const [lat, lon] = zipPoint("29201")! // Columbia, SC
    expect(lat).toBeCloseTo(34.0, 0)
    expect(lon).toBeCloseTo(-81.0, 0)
    expect(zipPoint("90210")).not.toBeNull()
    expect(zipPoint("99501")).not.toBeNull() // Anchorage
    expect(zipPoint("00601")).not.toBeNull() // Puerto Rico
  })
  it("returns null for bad or unmapped ZIPs", () => {
    expect(zipPoint(null)).toBeNull()
    expect(zipPoint("abcde")).toBeNull()
    expect(zipPoint("2760")).toBeNull()
    expect(zipPoint("00000")).toBeNull()
  })
  it("reads ZIP+4 by its first five digits", () => {
    expect(zipPoint("27601-1234")).toEqual(zipPoint("27601"))
  })
  it("every record is well formed and in range", () => {
    const recs = US_ZIP_POINTS.split(";")
    expect(recs.length).toBeGreaterThan(33000)
    for (const r of recs) {
      expect(r).toMatch(/^\d{5}-?\d+\.\d{2},-?\d+\.\d{2}$/)
      const [lat, lon] = r.slice(5).split(",").map(Number)
      expect(lat).toBeGreaterThan(-15)
      expect(lat).toBeLessThan(72)
      expect(lon).toBeGreaterThan(-180)
      expect(lon).toBeLessThan(180)
    }
  })
})
