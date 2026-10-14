import { describe, expect, it } from "vitest"

import { PREVIEW, buildMapPreview, projectToPreview } from "./map-preview"
import programs from "./programs-2026-27.json"
import type { CollegeMapSchool } from "./types"

const schools = programs.schools as CollegeMapSchool[]

describe("the picture of the college map", () => {
  it("puts the centre of the view in the centre of the picture", () => {
    expect(projectToPreview(PREVIEW.centerLon, PREVIEW.centerLat)).toEqual({ x: PREVIEW.width / 2, y: PREVIEW.height / 2 })
  })

  it("puts places where a map would: east is right, north is up, and the coasts are inside the frame", () => {
    const raleigh = projectToPreview(-78.64, 35.78)
    const seattle = projectToPreview(-122.33, 47.61)
    const miami = projectToPreview(-80.19, 25.76)
    expect(raleigh.x).toBeGreaterThan(seattle.x)
    expect(seattle.y).toBeLessThan(miami.y)
    for (const p of [raleigh, seattle, miami]) {
      expect(p.x).toBeGreaterThan(0)
      expect(p.x).toBeLessThan(PREVIEW.width)
      expect(p.y).toBeGreaterThan(0)
      expect(p.y).toBeLessThan(PREVIEW.height)
    }
  })

  it("draws nearly every college and counts them all", () => {
    const preview = buildMapPreview(schools)
    expect(preview.total).toBe(schools.length)
    expect(preview.dots.length).toBeGreaterThan(schools.length - 10)
    expect(preview.byDivision.reduce((n, d) => n + d.count, 0)).toBe(schools.length)
    expect(preview.backdropUrl).toBeNull()
  })

  it("shows a daughter's family the colleges with a women's team, and a saved college regardless", () => {
    const menOnly = schools.find((s) => s.programs.every((p) => !p.womens))!
    const womens = buildMapPreview(schools, { team: "womens" })
    expect(womens.total).toBe(schools.filter((s) => s.programs.some((p) => p.womens)).length)
    expect(womens.total).toBeLessThan(schools.length)
    const withSaved = buildMapPreview(schools, { team: "womens", savedIds: [menOnly.id] })
    expect(withSaved.total).toBe(womens.total + 1)
    expect(withSaved.dots.at(-1)).toMatchObject({ id: menOnly.id, saved: true })
  })
})
