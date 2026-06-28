import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  assertGlobalsProfileScrollCss,
  assertProfileMatchDataScrollContract,
} from "@/lib/profile-table-scroll"

const root = join(__dirname, "..")

function readRepoFile(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8")
}

describe("profile table horizontal scroll contract", () => {
  it("match data uses ProfileScrollTable and avoids scroll regressions", () => {
    const matchData = readRepoFile("components/match-data-section-improved.tsx")
    assertProfileMatchDataScrollContract([{ label: "match-data-section-improved", source: matchData }])
    expect(matchData).toContain("PROFILE_TABLE_WIDTH_CONSTRAINT_CLASS")
    expect(matchData).toContain("profileMatchDataCardClass")
  })

  it("globals.css keeps touch-friendly horizontal scroll rules", () => {
    const css = readRepoFile("app/globals.css")
    assertGlobalsProfileScrollCss(css)
    expect(css).toContain("[data-profile-scroll-table]")
  })

  it("shared scroll class does not restrict touch to pan-x only", () => {
    const utils = readRepoFile("lib/utils.ts")
    expect(utils).toContain("scroll-table-x")
    expect(utils).not.toContain("touch-pan-x")
  })

  it("match data imports table parts but not the shadcn Table wrapper", () => {
    const matchData = readRepoFile("components/match-data-section-improved.tsx")
    expect(matchData).toMatch(/TableBody|TableCell|TableHead|TableHeader|TableRow/)
    expect(matchData).not.toMatch(/import\s*\{[^}]*\bTable\b[^}]*\}\s*from\s*"@\/components\/ui\/table"/)
    expect(matchData).not.toMatch(/\<Table[\s>]/)
  })
})
