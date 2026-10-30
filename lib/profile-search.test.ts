import { describe, expect, it } from "vitest"
import { profileRobots } from "./profile-search"

describe("profileRobots", () => {
  const now = new Date("2026-10-30T12:00:00Z")
  it("indexes a current high-school class, never its photo", () => {
    const r = profileRobots({ graduationyear: 2028 }, now)
    expect(r.index).toBe(true)
    expect(r.noimageindex).toBe(true)
    expect(r["max-image-preview"]).toBe("none")
  })
  it("keeps out graduated, middle-school and unknown classes", () => {
    expect(profileRobots({ graduationyear: 2025 }, now).index).toBe(false)
    expect(profileRobots({ graduationyear: 2033 }, now).index).toBe(false)
    expect(profileRobots({ graduationyear: null }, now).index).toBe(false)
    expect(profileRobots(null, now).index).toBe(false)
  })
  it("respects a family's choice to hide the profile", () => {
    expect(profileRobots({ graduationyear: 2028, custom_attributes: { search_hidden: true } }, now).index).toBe(false)
  })
})
