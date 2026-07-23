import { describe, expect, it } from "vitest"
import { answerTournamentOfChampionsQuestion, isTournamentOfChampionsQuery } from "@/lib/data-dawg-toc-info"

describe("Data Dawg TOC page facts", () => {
  it("routes Tournament of Champions questions deterministically", () => {
    expect(isTournamentOfChampionsQuery("What are the Tournament of Champions weight classes?")).toBe(true)
    expect(isTournamentOfChampionsQuery("Where is TOC located?")).toBe(true)
    expect(isTournamentOfChampionsQuery("Tell me about Cardinal Gibbons wrestling")).toBe(false)
  })

  it("answers weight class and location questions from the TOC page facts", async () => {
    const answer = await answerTournamentOfChampionsQuestion("What are the TOC weight classes and location?")

    expect(answer).toContain("117, 125, 133, 141, 149, 157, 165, 174, 184, 197, 285")
    expect(answer).toContain("Hope Community Church")
    expect(answer).toContain("2080 East Williams Street")
    expect(answer).toContain("Tournament of Champions page")
  })
})
