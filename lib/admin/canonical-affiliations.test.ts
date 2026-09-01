import { describe, expect, it } from "vitest"
import { resolveClubName, resolveSchoolName } from "./canonical-affiliations"

const clubs = [{ id: 26, name: "Combat Athletics" }, { id: 36, name: "School of Hard Knocks" }]
const schools = [{ name: "Trinity", canonical_name: null }, { name: "Mooresville Senior High School", canonical_name: "Mooresville" }]

const fake = (table: string) =>
  ({ from: (t: string) => ({ select: async () => ({ data: t === "wrestling_clubs" ? clubs : schools }) }) }) as never

describe("resolveClubName", () => {
  it("returns the directory's spelling, not the submitted one", async () => {
    const r = await resolveClubName(fake("wrestling_clubs"), "combat athletics")
    expect(r).toEqual({ ok: true, canonical: "Combat Athletics", clubId: 26 })
  })

  it("matches through the club normaliser", async () => {
    const r = await resolveClubName(fake("wrestling_clubs"), "School of hard knocks wrestling club")
    expect(r.ok && r.canonical).toBe("School of Hard Knocks")
  })

  it("refuses a club that is not in the directory, so no logo is lost", async () => {
    const r = await resolveClubName(fake("wrestling_clubs"), "B2A")
    expect(r.ok).toBe(false)
  })
})

describe("resolveSchoolName", () => {
  it("prefers the canonical name when one is set", async () => {
    const r = await resolveSchoolName(fake("schools"), "Mooresville Senior High School")
    expect(r.ok && r.canonical).toBe("Mooresville")
  })

  it("does not let a misspelling match a real school", async () => {
    expect((await resolveSchoolName(fake("schools"), "Trinty high school")).ok).toBe(false)
    expect((await resolveSchoolName(fake("schools"), "Trinity High School")).ok).toBe(true)
  })
})
