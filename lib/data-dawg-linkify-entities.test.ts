import { describe, expect, it } from "vitest"
import { linkableEntitiesFromToolResult, linkifyKnownEntities } from "./data-dawg-linkify-entities"

describe("linkableEntitiesFromToolResult", () => {
  it("reads a school dossier's page, nested under facts or not", () => {
    // "lumberton" misses the school fast path, so the answer is written from the tool result and
    // this is the only place the page URL can come from.
    const nested = JSON.stringify({ facts: { name: "Lumberton", page_url: "https://x/high-schools/lumberton" } })
    expect(linkableEntitiesFromToolResult(nested)).toEqual([
      { name: "Lumberton", url: "https://x/high-schools/lumberton" },
    ])
    const flat = JSON.stringify({ name: "Lumberton", page_url: "https://x/high-schools/lumberton" })
    expect(linkableEntitiesFromToolResult(flat)).toHaveLength(1)
  })

  it("reads an athlete and their school from one dossier", () => {
    const result = JSON.stringify({
      facts: {
        name: "Mac Johnson",
        profile_url: "https://x/view-profile?id=1",
        high_school: "Cape Fear",
        high_school_url: "https://x/high-schools/cape-fear",
      },
    })
    expect(linkableEntitiesFromToolResult(result).map((e) => e.name)).toEqual(["Mac Johnson", "Cape Fear"])
  })

  it("is quiet on an error payload or anything unparseable", () => {
    expect(linkableEntitiesFromToolResult(JSON.stringify({ error: "not found" }))).toEqual([])
    expect(linkableEntitiesFromToolResult("not json")).toEqual([])
    expect(linkableEntitiesFromToolResult("")).toEqual([])
  })

  it("links the school named in prose", () => {
    const ents = linkableEntitiesFromToolResult(
      JSON.stringify({ facts: { name: "Lumberton", page_url: "https://x/high-schools/lumberton" } }),
    )
    expect(linkifyKnownEntities("Lumberton High School has 6 state champions.", ents)).toBe(
      "[Lumberton](https://x/high-schools/lumberton) High School has 6 state champions.",
    )
  })
})
