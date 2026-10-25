import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { parseRecap } from "./recap"

const md = fs.readFileSync(path.join(process.cwd(), "content/news/super32-2026-nc-boys-recap.md"), "utf8")

describe("Super 32 2026 boys recap", () => {
  const r = parseRecap(md)
  it("splits the free top from the grades", () => {
    expect(r.title).toBe("Super 32 2026 — North Carolina Boys Recap")
    expect(r.intro).toContain("## How the Grades Work")
    expect(r.intro).not.toContain("## A+")
    expect(r.intro).not.toContain("PRODUCTION NOTES")
  })
  it("pulls every graded wrestler with grade and weight", () => {
    const by = Object.fromEntries(r.graded.map((g) => [g.name, g]))
    expect(by["Mason Brown"]).toMatchObject({ grade: "A+", weight: "120" })
    expect(by["Aiden White"]).toMatchObject({ grade: "A", weight: "138" })
    expect(by["Ammon Scott"]).toMatchObject({ grade: "B-", weight: "150" })
    expect(r.graded.filter((g) => g.grade === "A+").map((g) => g.name)).toEqual(["Mason Brown", "Braylen Yates", "Ellis Chia"])
    expect(r.graded.length).toBe(23)
  })
  it("reads the honorable mentions and keeps the closing sections", () => {
    expect(r.honorableMention.find((h) => h.name === "Tobin McNair")?.weight).toBe("165")
    expect(r.outro).toContain("## The Rest of the Squad")
  })
})

describe("recap grades for the coach report", () => {
  it("maps each graded and mentioned wrestler to a grade and the recap link", async () => {
    const { recapGradesFor, nameKey } = await import("./recap")
    const m = recapGradesFor("super32-2026", "https://app.ncwrestlingunited.com")
    expect(m.get(nameKey("Mason Brown"))).toMatchObject({ grade: "A+", url: "https://app.ncwrestlingunited.com/news/super32-2026-nc-boys-recap" })
    expect(m.get(nameKey("Tobin McNair"))?.grade).toBe("Honorable Mention")
    expect(recapGradesFor("journeymen-fall-classic-2026", "x").size).toBe(0)
  })
})
