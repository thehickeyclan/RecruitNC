import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { OUT, buildCss } from "../../scripts/gen-recruit-brand-css.mjs"

describe("recruiting blue stylesheet", () => {
  it("is up to date with every gold class in the app (run node scripts/gen-recruit-brand-css.mjs)", () => {
    expect(readFileSync(OUT, "utf8")).toBe(buildCss().css)
  })
  it("maps every gold class it finds", () => {
    expect(buildCss().skipped).toEqual([])
  })
})
