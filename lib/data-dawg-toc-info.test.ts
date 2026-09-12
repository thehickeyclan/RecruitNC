import { describe, expect, it } from "vitest"
import {
  answerTournamentOfChampionsQuestion,
  duringTournamentWeek,
  isTournamentOfChampionsQuery,
} from "@/lib/data-dawg-toc-info"

describe("Data Dawg TOC page facts", () => {
  it("routes Tournament of Champions questions deterministically", () => {
    expect(isTournamentOfChampionsQuery("What are the Tournament of Champions weight classes?")).toBe(true)
    expect(isTournamentOfChampionsQuery("Where is TOC located?")).toBe(true)
    expect(isTournamentOfChampionsQuery("Tell me about Cardinal Gibbons wrestling")).toBe(false)
  })

  /**
   * Release night: two people asked where the brackets were, neither typed "TOC", and both were
   * sent to the NCHSAA website.
   */
  it("takes a bare bracket question, and leaves other tournaments alone", () => {
    expect(isTournamentOfChampionsQuery("where can i see the brackets")).toBe(true)
    expect(isTournamentOfChampionsQuery("who is the 1 seed at 141")).toBe(true)
    expect(isTournamentOfChampionsQuery("when do brackets come out?")).toBe(true)

    expect(isTournamentOfChampionsQuery("who won the 3A bracket")).toBe(false)
    expect(isTournamentOfChampionsQuery("what was his seed at the NCHSAA state championship")).toBe(false)
    expect(isTournamentOfChampionsQuery("show me his 2025 bracket")).toBe(false)
    expect(isTournamentOfChampionsQuery("Super 32 brackets")).toBe(false)
  })

  /**
   * Results wording is only ours while the tournament is running. In October, "how many wins does
   * he have at 149" is a career question and belongs to the data agent.
   */
  it("takes results questions during tournament week only", () => {
    const during = new Date("2026-09-19T15:00:00-04:00")
    const after = new Date("2026-10-15T15:00:00-04:00")

    expect(duringTournamentWeek(during)).toBe(true)
    expect(duringTournamentWeek(after)).toBe(false)

    expect(isTournamentOfChampionsQuery("what are the results at 117", during)).toBe(true)
    expect(isTournamentOfChampionsQuery("who are the champions so far", during)).toBe(true)
    expect(isTournamentOfChampionsQuery("who won at 149", during)).toBe(true)

    expect(isTournamentOfChampionsQuery("what are the results at 117", after)).toBe(false)
    expect(isTournamentOfChampionsQuery("how many career wins does he have at 149", during)).toBe(false)
    expect(isTournamentOfChampionsQuery("how many wins does he have this season", during)).toBe(false)
  })

  it("answers weight class and location questions from the TOC page facts", async () => {
    const answer = await answerTournamentOfChampionsQuestion("What are the TOC weight classes and location?")

    // Ten weights since 184 was dropped on 5 September 2026.
    expect(answer).toContain("117, 125, 133, 141, 149, 157, 165, 174, 197, 285")
    expect(answer).not.toContain("184")
    expect(answer).toContain("Hope Community Church")
    expect(answer).toContain("2080 East Williams Street")
    expect(answer).toContain("Tournament of Champions page")
  })
})
