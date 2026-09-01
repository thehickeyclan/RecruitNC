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

  it("refuses an unknown club when the current one is known, so no logo is lost", async () => {
    const r = await resolveClubName(fake("wrestling_clubs"), "B2A", "Combat Athletics")
    expect(r.ok).toBe(false)
  })

  it("allows an unknown club when the current one is unknown too — nothing to lose", async () => {
    const r = await resolveClubName(fake("wrestling_clubs"), "B2A", "Believe 2 Achieve")
    expect(r).toEqual({ ok: true, canonical: "B2A" })
  })
})

describe("resolveSchoolName", () => {
  it("prefers the canonical name when one is set", async () => {
    const r = await resolveSchoolName(fake("schools"), "Mooresville Senior High School")
    expect(r.ok && r.canonical).toBe("Mooresville")
  })

  it("does not let a misspelling overwrite a school that resolves", async () => {
    expect((await resolveSchoolName(fake("schools"), "Trinty high school", "Trinity")).ok).toBe(false)
    expect((await resolveSchoolName(fake("schools"), "Trinity High School", "Trinity")).ok).toBe(true)
  })

  it("lets an unlisted school through when the current one is unlisted too", async () => {
    const r = await resolveSchoolName(fake("schools"), "Middle Creek", "Middle Creek High")
    expect(r).toEqual({ ok: true, canonical: "Middle Creek" })
  })
})
