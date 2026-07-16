import { describe, expect, it } from "vitest"
import { getSuggestedPrompts, getRouteForSuggestedPrompt } from "@/lib/data-dawg-suggested-prompts"

const PAGES = [
  "/",
  "/public-rankings",
  "/rankings",
  "/tournament",
  "/nchsaa",
  "/nhsca",
  "/fargo",
  "/schools",
  "/athletes",
  "/record-books",
  "/dave-schultz",
]

/**
 * Verified failing against the live agent — see the note on getSuggestedPrompts.
 * They stay routable (a user may still type them); they must not be *suggested*.
 */
const KNOWN_BAD_CHIPS = [
  "When are NHSCA's?",
  "When are state championships?",
  "When is the next Rivalry Match?",
  "What region is Davie in?",
  "Which colleges have the most Dave Schultz Award winners?",
  "What was our best year for NHSCA All-Americans?",
]

describe("getSuggestedPrompts", () => {
  it("never suggests a prompt we know answers badly", () => {
    for (const page of PAGES) {
      for (const prompt of getSuggestedPrompts(page)) {
        expect(KNOWN_BAD_CHIPS, `${page} suggests known-bad chip: ${prompt}`).not.toContain(prompt)
      }
    }
  })

  it("gives every page a non-empty, duplicate-free set", () => {
    for (const page of PAGES) {
      const prompts = getSuggestedPrompts(page)
      expect(prompts.length, page).toBeGreaterThan(0)
      expect(new Set(prompts).size, `${page} has duplicate chips`).toBe(prompts.length)
    }
  })

  it("tailors chips to the page instead of always showing the default set", () => {
    const home = getSuggestedPrompts("/").join("|")
    for (const page of ["/nhsca", "/fargo", "/schools", "/tournament", "/rankings"]) {
      expect(getSuggestedPrompts(page).join("|"), `${page} fell through to the default set`).not.toBe(home)
    }
  })

  it("keeps rankings chips on rankings pages (both path spellings)", () => {
    for (const page of ["/rankings", "/public-rankings"]) {
      expect(getSuggestedPrompts(page)).toContain("Show me all Class of 2026 rankings")
    }
  })

  it("still routes a known-bad prompt if a user types it — only the chip is withdrawn", () => {
    expect(getRouteForSuggestedPrompt("When are NHSCA's?")).toEqual({ handler: "calendar", params: undefined })
  })
})
