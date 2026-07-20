import { describe, expect, it } from "vitest"
import { buildRankWrestlerSeasonPayload, parseRankWrestlerText, rankWrestlerTextCandidatesFromHtml } from "./rankwrestler-parser"

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

describe("parseRankWrestlerText", () => {
  it("parses rendered RankWrestler profile text copied from Match History", () => {
    const renderedProfileText = [
      "#5",
      "What If?",
      "Mattex Adams",
      "Match History",
      "*Top 3 Wins highlighted in gold*",
      "Loss",
      "2/21/2026",
      "Ethan Finn",
      "• Pinecrest High School",
      "126 lbs",
      "•",
      "Dec",
      "NCHSAA State Championships",
      "99.91",
      "Win",
      "2/14/2026",
      "jesse farnsworth",
      "126 lbs",
      "•",
      "MD",
      "NCHSAA 8A East Regional",
      "99.31",
      "Win",
      "1/29/2026",
      "Forfeit",
      "126 lbs",
      "•",
      "For.",
      "Rolesville/Leesville/Apex Friendship",
    ].join("\n")

    const matches = parseRankWrestlerText(renderedProfileText)

    expect(matches).toHaveLength(3)
    expect(matches[0]).toMatchObject({
      date: "2/21/2026",
      winner: "Ethan Finn",
      winner_school: "Pinecrest High School",
      result: "Dec",
      venue: "NCHSAA State Championships",
      weight: "126",
      opp_percent: 99.91,
    })
    expect(matches[1]).toMatchObject({
      date: "2/14/2026",
      loser: "jesse farnsworth",
      loser_school: "",
      result: "MD",
      venue: "NCHSAA 8A East Regional",
      weight: "126",
      opp_percent: 99.31,
    })
    expect(matches[2]).toMatchObject({
      date: "1/29/2026",
      loser: "Forfeit",
      result: "For.",
      venue: "Rolesville/Leesville/Apex Friendship",
      weight: "126",
    })
  })

  it("parses compact rendered RankWrestler rows without a Match History heading", () => {
    const renderedProfileText =
      "#5 What If? Mattex Adams Leesville Road • 126 • Sr Career Record: 49-12 " +
      "*Top 3 Wins highlighted in gold* " +
      "Loss 2/21/2026 99.91 Ethan Finn • Pinecrest High School 126 lbs • NCHSAA State Championships • Dec " +
      "Win 2/21/2026 99.11 Christopher Maynor • Charles E. Jordan 126 lbs • NCHSAA State Championships • Dec " +
      "Win 2/21/2026 99.86 Wyatt Watkins • Millbrook 126 lbs • NCHSAA State Championships • N"

    const matches = parseRankWrestlerText(renderedProfileText)

    expect(matches).toHaveLength(3)
    expect(matches[0]).toMatchObject({
      date: "2/21/2026",
      winner: "Ethan Finn",
      winner_school: "Pinecrest High School",
      result: "Dec",
      venue: "NCHSAA State Championships",
      weight: "126",
      opp_percent: 99.91,
    })
    expect(matches[1]).toMatchObject({
      date: "2/21/2026",
      loser: "Christopher Maynor",
      loser_school: "Charles E. Jordan",
      result: "Dec",
      venue: "NCHSAA State Championships",
      weight: "126",
      opp_percent: 99.11,
    })
  })
})
