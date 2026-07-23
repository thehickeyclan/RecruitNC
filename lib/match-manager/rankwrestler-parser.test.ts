import { describe, expect, it } from "vitest"
import {
  buildRankWrestlerSeasonPayload,
  parseRankWrestlerText,
  rankWrestlerTextCandidatesFromHtml,
  RANKWRESTLER_SNAPSHOT_SEPARATOR,
} from "./rankwrestler-parser"

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

  it("keeps forfeits, school-less opponents, and rating-less opponents (Gavin Hickey 2025-26 regression)", () => {
    // Real paste from RankWrestler, 7/17/2026. The old fixed-offset parser dropped 15 of
    // these 63 matches: all 5 forfeits (venue/method offsets swapped), all 8 rows whose
    // opponent has no school line, and Will Guinane (school but no rating). Rows here are
    // rendered in "variant B" order: rating after date, venue before method, two bullets.
    type E = { wl: "Win" | "Loss"; d: string; pct?: string; name?: string; school?: string; w: string; venue: string; m: string }
    const entries: E[] = [
      { wl: "Loss", d: "2/21/2026", pct: "99.90", name: "Chris Braxton", school: "New Hanover", w: "126", venue: "NCHSAA State Championships", m: "MD" },
      { wl: "Win", d: "2/21/2026", pct: "99.62", name: "Max Fleckinger", school: "North Brunswick", w: "126", venue: "NCHSAA State Championships", m: "TF" },
      { wl: "Loss", d: "2/21/2026", pct: "99.87", name: "Brennan Ferguson", school: "Cuthbertson", w: "126", venue: "NCHSAA State Championships", m: "MD" },
      { wl: "Win", d: "2/17/2026", pct: "90.91", name: "Bryan Jones", school: "Lumberton", w: "126", venue: "NCHSAA 7A State Dual Championships", m: "TF" },
      { wl: "Loss", d: "2/14/2026", pct: "99.90", name: "Chris Braxton", school: "New Hanover", w: "126", venue: "NCHSAA 7A East Regional", m: "TF" },
      { wl: "Win", d: "2/14/2026", pct: "99.68", name: "Zyon Rogers", w: "126", venue: "NCHSAA 7A East Regional", m: "Dec" },
      { wl: "Win", d: "2/14/2026", pct: "99.41", name: "Landen Fox", school: "New Bern", w: "126", venue: "NCHSAA 7A East Regional", m: "Fall" },
      { wl: "Win", d: "2/14/2026", pct: "18.51", name: "Tyler Stanton", school: "Garner Magnet", w: "126", venue: "NCHSAA 7A East Regional", m: "Fall" },
      { wl: "Win", d: "2/11/2026", pct: "97.51", name: "Kaleb Daniels", school: "Grimsley", w: "126", venue: "NCHSAA Dual Team Series 7A @ Cardinal Gibbons", m: "MD" },
      { wl: "Win", d: "2/10/2026", w: "126", venue: "NCHSAA Dual Team Series 7A @ Cardinal Gibbons", m: "For." },
      { wl: "Win", d: "1/28/2026", w: "120", venue: "Tri @ Cardinal Gibbons w/ Green Hope", m: "For." },
      { wl: "Win", d: "1/28/2026", pct: "95.95", name: "Tyler Hackett", school: "Cary", w: "126", venue: "Tri @ Cardinal Gibbons w/ Green Hope", m: "Fall" },
      { wl: "Win", d: "1/22/2026", pct: "77.35", name: "Hunter Pelligrino", school: "Felton Grove", w: "126", venue: "Dual", m: "Fall" },
      { wl: "Win", d: "1/17/2026", pct: "2.10", name: "Timothy Flannagan", school: "Southern Nash", w: "126", venue: "Coach T Memorial", m: "Fall" },
      { wl: "Loss", d: "1/17/2026", pct: "99.11", name: "Christopher Maynor", school: "Charles E. Jordan", w: "126", venue: "Coach T Memorial", m: "Dec" },
      { wl: "Win", d: "1/17/2026", pct: "99.35", name: "The`On Baker Ii", school: "Hillside", w: "126", venue: "Coach T Memorial", m: "Fall" },
      { wl: "Win", d: "1/17/2026", pct: "90.91", name: "Bryan Jones", school: "Lumberton", w: "126", venue: "Coach T Memorial", m: "MD" },
      { wl: "Win", d: "1/15/2026", pct: "2.34", name: "Beau Loughridge", school: "Holly Springs", w: "126", venue: "Dual", m: "Fall" },
      { wl: "Loss", d: "1/10/2026", w: "120", venue: "2026 East Coast Catholic Classic", m: "For." },
      { wl: "Win", d: "1/10/2026", name: "Will Guinane", school: "Benedictine College Preparatory (VA)", w: "120", venue: "2026 East Coast Catholic Classic", m: "Fall" },
      { wl: "Loss", d: "1/10/2026", pct: "99.86", name: "Rocco Lombardo", school: "Malvern Preparatory School (PA)", w: "120", venue: "2026 East Coast Catholic Classic", m: "TF" },
      { wl: "Win", d: "1/10/2026", pct: "92.59", name: "Jayden Leneus", school: "St. Benedicts (NJ)", w: "120", venue: "2026 East Coast Catholic Classic", m: "SV-1" },
      { wl: "Win", d: "1/8/2026", w: "126", venue: "MCHS Tri", m: "For." },
      { wl: "Loss", d: "1/8/2026", pct: "99.91", name: "Naylor Higgins", school: "Middle Creek", w: "126", venue: "MCHS Tri", m: "Fall" },
      { wl: "Win", d: "1/2/2026", w: "126", venue: "Husky Duals", m: "For." },
      { wl: "Win", d: "1/2/2026", pct: "99.56", name: "Cole Mitchell", w: "126", venue: "Husky Duals", m: "Fall" },
      { wl: "Win", d: "1/2/2026", pct: "96.77", name: "Conner Anderson", school: "William Amos Hough", w: "126", venue: "Husky Duals", m: "Dec" },
      { wl: "Win", d: "1/2/2026", pct: "90.44", name: "Justice Hendley", school: "Watauga", w: "126", venue: "Husky Duals", m: "MD" },
      { wl: "Win", d: "1/2/2026", pct: "15.81", name: "Mikhil Sokolov", school: "Ardrey Kell", w: "126", venue: "Husky Duals", m: "Fall" },
      { wl: "Win", d: "1/2/2026", pct: "98.85", name: "Barric Heraty", school: "Providence", w: "126", venue: "Husky Duals", m: "Dec" },
      { wl: "Loss", d: "1/2/2026", pct: "99.33", name: "Garrett Whitaker", school: "Davie", w: "126", venue: "Husky Duals", m: "Fall" },
      { wl: "Win", d: "1/2/2026", pct: "99.40", name: "Marcus Soukup", school: "Union Pines", w: "126", venue: "Husky Duals", m: "MD" },
      { wl: "Win", d: "1/2/2026", pct: "72.70", name: "Russell Morales", school: "Oakton (VA)", w: "126", venue: "Husky Duals", m: "Dec" },
      { wl: "Win", d: "12/23/2025", pct: "99.77", name: "Noah Reid", w: "126", venue: "Tiger Holiday Classic 2025", m: "Dec" },
      { wl: "Loss", d: "12/23/2025", pct: "99.94", name: "Jace Barrier", school: "Mooresville High School", w: "126", venue: "Tiger Holiday Classic 2025", m: "MD" },
      { wl: "Loss", d: "12/23/2025", pct: "99.75", name: "Lucas Angell", school: "Currituck County", w: "126", venue: "Tiger Holiday Classic 2025", m: "Fall" },
      { wl: "Win", d: "12/23/2025", pct: "99.41", name: "Landen Fox", school: "New Bern", w: "126", venue: "Tiger Holiday Classic 2025", m: "Dec" },
      { wl: "Win", d: "12/23/2025", pct: "24.19", name: "Dawson `Jake` English", school: "North Pitt", w: "126", venue: "Tiger Holiday Classic 2025", m: "Fall" },
      { wl: "Win", d: "12/23/2025", pct: "72.83", name: "Jackson Brown", school: "Parkersburg High (WV)", w: "126", venue: "Tiger Holiday Classic 2025", m: "Dec" },
      { wl: "Loss", d: "12/13/2025", pct: "99.84", name: "Rory Gallagher", school: "John T. Hoggard High School", w: "126", venue: "2025 Crusader Duals", m: "Fall" },
      { wl: "Win", d: "12/13/2025", pct: "98.90", name: "Christopher Geiger", w: "126", venue: "2025 Crusader Duals", m: "Fall" },
      { wl: "Loss", d: "12/13/2025", pct: "99.91", name: "Paxton Kearns", school: "Uwharrie Charter Academy", w: "126", venue: "2025 Crusader Duals", m: "Dec" },
      { wl: "Win", d: "12/13/2025", pct: "28.53", name: "Tobias Valentine", school: "Overhills", w: "126", venue: "2025 Crusader Duals", m: "Fall" },
      { wl: "Win", d: "12/6/2025", pct: "99.11", name: "Christopher Maynor", school: "Charles E. Jordan", w: "126", venue: "Jim King Orange Invitational", m: "Fall" },
      { wl: "Win", d: "12/6/2025", pct: "99.11", name: "Christopher Maynor", school: "Charles E. Jordan", w: "126", venue: "Jim King Orange Invitational", m: "Dec" },
      { wl: "Win", d: "12/6/2025", pct: "55.87", name: "Dawson Pittard", school: "Southern Alamance", w: "126", venue: "Jim King Orange Invitational", m: "Fall" },
      { wl: "Win", d: "12/6/2025", pct: "93.38", name: "Jaxton Couch", school: "Pine Forest", w: "126", venue: "Jim King Orange Invitational", m: "Fall" },
      { wl: "Loss", d: "12/6/2025", pct: "99.97", name: "Ayden Sumners", school: "Wheatmore", w: "126", venue: "Jim King Orange Invitational", m: "Fall" },
      { wl: "Win", d: "11/29/2025", pct: "68.56", name: "Justin Masserdotti", w: "126", venue: "Cribb Memorial", m: "Fall" },
      { wl: "Loss", d: "11/29/2025", pct: "98.44", name: "Landon Doody", school: "Bunn", w: "126", venue: "Cribb Memorial", m: "Fall" },
      { wl: "Win", d: "11/29/2025", pct: "58.22", name: "Demarlo Garner", school: "Southern School Of Energy And Sustainability", w: "126", venue: "Cribb Memorial", m: "Fall" },
      { wl: "Win", d: "11/22/2025", pct: "98.49", name: "Diego Colon-Perez", w: "126", venue: "Red Wolf Invitational", m: "Fall" },
      { wl: "Win", d: "11/22/2025", pct: "99.56", name: "Cole Mitchell", w: "126", venue: "Red Wolf Invitational", m: "Fall" },
      { wl: "Loss", d: "11/22/2025", pct: "99.32", name: "Ian Speight", school: "Person", w: "126", venue: "Red Wolf Invitational", m: "Fall" },
      { wl: "Win", d: "11/22/2025", pct: "99.27", name: "Lloy Bosan", school: "Randleman", w: "126", venue: "Red Wolf Invitational", m: "Dec" },
      { wl: "Loss", d: "11/22/2025", pct: "99.32", name: "Ian Speight", school: "Person", w: "126", venue: "Red Wolf Invitational", m: "Fall" },
      { wl: "Win", d: "11/22/2025", pct: "2.34", name: "Beau Loughridge", school: "Holly Springs", w: "126", venue: "Red Wolf Invitational", m: "Fall" },
      { wl: "Win", d: "11/22/2025", pct: "55.87", name: "Dawson Pittard", school: "Southern Alamance", w: "126", venue: "Red Wolf Invitational", m: "Fall" },
      { wl: "Win", d: "11/15/2025", pct: "99.87", name: "Edgar Vasquez", w: "126", venue: "Wolverine Challenge", m: "Dec" },
      { wl: "Loss", d: "11/15/2025", pct: "99.93", name: "Elgia Helmstetter", school: "Chapel Hill", w: "126", venue: "Wolverine Challenge", m: "Dec" },
      { wl: "Win", d: "11/15/2025", pct: "99.22", name: "Luke Ayers", school: "Seaforth", w: "126", venue: "Wolverine Challenge", m: "Fall" },
      { wl: "Win", d: "11/15/2025", pct: "12.61", name: "Kason Old", school: "Fuquay-Varina", w: "126", venue: "Wolverine Challenge", m: "Fall" },
      { wl: "Win", d: "11/15/2025", pct: "93.38", name: "Jaxton Couch", school: "Pine Forest", w: "126", venue: "Wolverine Challenge", m: "Fall" },
    ]
    const lines: string[] = []
    for (const e of entries) {
      lines.push(e.wl, e.d)
      if (e.pct) lines.push(e.pct)
      if (e.name) lines.push(e.name)
      else lines.push("Forfeit")
      if (e.school) lines.push(`• ${e.school}`)
      lines.push(`${e.w} lbs`, "•", e.venue, "•", e.m)
    }

    const matches = parseRankWrestlerText(lines.join("\n"))
    expect(matches).toHaveLength(63)

    // The three structural drop classes, by their exemplars:
    const forfeits = matches.filter((m) => (m.winner || m.loser) === "Forfeit")
    expect(forfeits).toHaveLength(5)
    const forfeitLoss = matches.find((m) => m.winner === "Forfeit" && m.date === "1/10/2026")
    expect(forfeitLoss).toMatchObject({ weight: "120", venue: "2026 East Coast Catholic Classic", result: "For." })

    expect(matches.find((m) => m.loser === "Zyon Rogers")).toMatchObject({
      loser_school: "",
      venue: "NCHSAA 7A East Regional",
      result: "Dec",
      opp_percent: 99.68,
    })
    expect(matches.find((m) => m.loser === "Will Guinane")).toMatchObject({
      loser_school: "Benedictine College Preparatory (VA)",
      weight: "120",
      result: "Fall",
      opp_percent: null,
    })
    expect(matches.filter((m) => m.loser === "Cole Mitchell")).toHaveLength(2)

    const payload = buildRankWrestlerSeasonPayload({
      athleteName: "Gavin Hickey",
      graduationYear: 2029,
      highSchool: "Cardinal Gibbons",
      rawText: lines.join("\n"),
    })
    expect(payload.success).toBe(true)
    if (payload.success) {
      // A manual paste is one snapshot, so nothing is deduped: the second Ian Speight loss
      // is a real tournament rematch (pool play + bracket), not a capture artifact.
      expect(payload.diagnostics.parsedMatches).toBe(63)
      expect(payload.diagnostics.duplicatesRemoved).toBe(0)
      expect(payload.payload.season_summary.wins).toBe(46)
      expect(payload.payload.season_summary.losses).toBe(17)
      expect(payload.payload.season_summary.forfeits_won).toBe(4)
      expect(payload.payload.wrestler_info.season).toBe("2025-26")
      expect(payload.payload.matches.filter((m) => m.opponent === "Ian Speight")).toHaveLength(2)
    }
  })

  it("collapses rows repeated across browser snapshots but keeps real rematches within one", () => {
    // Two overlapping scroll snapshots: Lloy Bosan appears in both (capture artifact), and
    // the Ian Speight loss appears twice INSIDE each snapshot (real rematch).
    const snapshot = [
      "Loss", "11/22/2025", "99.32", "Ian Speight", "• Person", "126 lbs", "•", "Red Wolf Invitational", "•", "Fall",
      "Win", "11/22/2025", "99.27", "Lloy Bosan", "• Randleman", "126 lbs", "•", "Red Wolf Invitational", "•", "Dec",
      "Loss", "11/22/2025", "99.32", "Ian Speight", "• Person", "126 lbs", "•", "Red Wolf Invitational", "•", "Fall",
    ].join("\n")

    const payload = buildRankWrestlerSeasonPayload({
      athleteName: "Gavin Hickey",
      graduationYear: 2029,
      rawText: `${snapshot}${RANKWRESTLER_SNAPSHOT_SEPARATOR}${snapshot}`,
    })

    expect(payload.success).toBe(true)
    if (payload.success) {
      // 6 rows parsed across the two snapshots; per-snapshot truth is 2 Speight + 1 Bosan.
      expect(payload.diagnostics.parsedMatches).toBe(6)
      expect(payload.payload.matches.filter((m) => m.opponent === "Ian Speight")).toHaveLength(2)
      expect(payload.payload.matches.filter((m) => m.opponent === "Lloy Bosan")).toHaveLength(1)
      expect(payload.payload.season_summary.total_matches).toBe(3)
    }
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
