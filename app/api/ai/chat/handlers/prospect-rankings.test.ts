import { describe, expect, it } from "vitest"
import { NextRequest } from "next/server"
import { handleProspectRankings } from "./prospect-rankings"

describe("handleProspectRankings", () => {
  it("never returns ranking data and directs the user to sign in or subscribe", async () => {
    const result = await handleProspectRankings(
      { query: "Who is ranked number one in the Class of 2027?" },
      new NextRequest("https://app.ncwrestlingunited.com/api/ai/chat"),
      "ranking-gate-test",
    )

    const body = await result.directResponse?.json()
    expect(body.answer).toContain("aren’t available through Data Dawg")
    expect(body.answer).toContain("https://app.ncwrestlingunited.com/rankings")
    expect(body.answer).not.toMatch(/#\d+|Class of 2027.*rank/i)
    expect(body.results).toBeUndefined()
  })
})
