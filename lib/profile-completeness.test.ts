import { describe, expect, it } from "vitest"
import { completenessFromRow } from "./profile-completeness"
import { isPlaceholderAthletePhoto } from "./recruiting-profile-photo"

const row = { highschool: "Trinity", academic_gpa: 3.1, phone: "9195550100" }

describe("completeness and the stand-in photo", () => {
  it("does not count the silhouette as a photo", () => {
    const c = completenessFromRow({ ...row, photourl: "/wrestler-silhouette.png" })
    expect(c.percent).toBe(60)
    expect(c.items[0]).toMatchObject({ done: false, edit: "photo" })
  })

  it("counts a real photo", () => {
    const c = completenessFromRow({ ...row, photourl: "https://example.com/travis.jpg" })
    expect(c.percent).toBe(80)
    expect(c.items[0].done).toBe(true)
  })

  it("recognises the stand-ins however they are written", () => {
    expect(isPlaceholderAthletePhoto("/wrestler-silhouette.png")).toBe(true)
    expect(isPlaceholderAthletePhoto("https://app.ncwrestlingunited.com/wrestler-silhouette.png?v=2")).toBe(true)
    expect(isPlaceholderAthletePhoto("/placeholder.svg")).toBe(true)
    expect(isPlaceholderAthletePhoto("https://example.com/me.jpg")).toBe(false)
    expect(isPlaceholderAthletePhoto("")).toBe(false)
  })
})
