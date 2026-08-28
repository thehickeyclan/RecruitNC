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
    // "/tournament" is deliberately absent: it used to serve run-the-event chips, and the only
    // pages matching it are read by parents. Falling through to the general set is the fix.
    for (const page of ["/nhsca", "/fargo", "/schools", "/rankings"]) {
      expect(getSuggestedPrompts(page).join("|"), `${page} fell through to the default set`).not.toBe(home)
    }
  })

  it("never offers a parent the tournament director's questions", () => {
    // A mother opening the TOC page in the app was asked whether she wanted to know how many
    // wrestlers fit on five mats. /tournament-of-champions contains "/tournament", so a loose
    // substring match handed her a job she does not have.
    const directorChips = [
      "What time will we finish?",
      "How many wrestlers can I fit with 5 mats for a 7 PM finish?",
      "What's a reasonable finish time for a Saturday tournament?",
      "What are the top reasons NC tournaments fail?",
    ]
    const pages = [
      "/",
      "/tournament-of-champions",
      "/tournament-of-champions/field",
      "/recruiting/tournaments",
      "/tournament",
      "/rankings",
      "/athletes",
      "/nchsaa",
      "/schools",
      "/fargo",
      "/nhsca",
    ]
    for (const page of pages) {
      for (const chip of directorChips) {
        expect(getSuggestedPrompts(page), `${page} still offers "${chip}"`).not.toContain(chip)
      }
    }
  })

  it("gives the TOC page the general chips a parent can actually use", () => {
    expect(getSuggestedPrompts("/tournament-of-champions")).toEqual(getSuggestedPrompts("/"))
  })

  it("still routes the director's questions when one of them is typed", () => {
    expect(getRouteForSuggestedPrompt("What time will we finish?")).toBeTruthy()
    expect(getRouteForSuggestedPrompt("What are the top reasons NC tournaments fail?")).toBeTruthy()
  })

  it("keeps rankings chips on rankings pages (both path spellings)", () => {
    for (const page of ["/rankings", "/public-rankings"]) {
      expect(getSuggestedPrompts(page)).toContain("Show me all Class of 2027 rankings")
      expect(getSuggestedPrompts(page)).toContain("Show me all Class of 2028 rankings")
      expect(getSuggestedPrompts(page)).not.toContain("Show me all Class of 2026 rankings")
    }
  })

  it("still routes a known-bad prompt if a user types it — only the chip is withdrawn", () => {
    expect(getRouteForSuggestedPrompt("When are NHSCA's?")).toEqual({ handler: "calendar", params: undefined })
  })
})
