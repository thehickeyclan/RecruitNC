import { describe, expect, it } from "vitest"
import { buildRankWrestlerSeasonPayload, rankWrestlerTextCandidatesFromHtml } from "./rankwrestler-parser"

describe("rankWrestlerTextCandidatesFromHtml", () => {
  it("extracts parsable match text from streamed Next flight payloads", () => {
    const embeddedText = [
      "Win",
      "12/14/2025",
      "0.625",
      "John Opponent",
      "Opponent High",
      "138 lbs",
      "•",
      "Holiday Duals",
      "•",
      "Fall 1:22",
      "Loss",
      "12/15/2025",
      "0.700",
      "Sam Winner",
      "Winner High",
      "138 lbs",
      "•",
      "Holiday Duals",
      "•",
      "Dec 4-2",
    ].join("\\n")
    const html = `
      <html>
        <head><title>RankWrestlers</title></head>
        <body>
          <div id="__next">RankWrestlers</div>
          <script>self.__next_f.push([1,${JSON.stringify(embeddedText)}])</script>
        </body>
      </html>
    `

    const candidates = rankWrestlerTextCandidatesFromHtml(html)
    expect(candidates.map((candidate) => candidate.source)).toContain("next_flight_decoded")

    const parsed = buildRankWrestlerSeasonPayload({
      athleteName: "Mattex Adams",
      graduationYear: 2027,
      highSchool: "Example High",
      rawText: candidates.find((candidate) => candidate.source === "next_flight_decoded")?.text ?? "",
      format: "rank",
      deduplicate: true,
    })

    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.payload.season_summary.total_matches).toBe(2)
      expect(parsed.payload.season_summary.wins).toBe(1)
      expect(parsed.payload.season_summary.losses).toBe(1)
      expect(parsed.payload.matches[0]?.opponent).toBe("John Opponent")
    }
  })
})
