import { describe, expect, it } from "vitest"

import { formatWin, nchsaaPhrase, ordinal, topSignificantWins, tournamentPhrase } from "./recruiting-guide-format"

/**
 * The rows here are the shapes production actually returns, taken from the TOC field: NCHSAA
 * rows carrying a null place for a non-placer, and NHSCA rows whose placement is an empty string
 * with only a record to show.
 */

describe("nchsaaPhrase", () => {
  it("names the class when every title was won in it", () => {
    expect(nchsaaPhrase([{ year: 2026, place: 1, classification: "4A" }])).toBe("NCHSAA 4A champion '26")
  })

  it("counts repeat titles rather than listing each one", () => {
    expect(
      nchsaaPhrase([
        { year: 2026, place: 1, classification: "3A" },
        { year: 2025, place: 1, classification: "3A" },
      ]),
    ).toBe("2× NCHSAA 3A champion '25 '26")
  })

  it("drops the class when the titles were won in different ones", () => {
    // A wrestler who moved up. Printing both as 3A would be a plain misstatement.
    expect(
      nchsaaPhrase([
        { year: 2026, place: 1, classification: "4A" },
        { year: 2025, place: 1, classification: "3A" },
      ]),
    ).toBe("2× NCHSAA champion '25 '26")
  })

  it("adds the best other placement behind a title", () => {
    expect(
      nchsaaPhrase([
        { year: 2026, place: 1, classification: "6A" },
        { year: 2025, place: 3, classification: "6A" },
      ]),
    ).toBe("NCHSAA 6A champion '26 · 3rd '25")
  })

  it("names the tournament for a placer who never won it", () => {
    // Printed with nothing around it, a bare "2nd '26" is a placement in nothing at all.
    expect(
      nchsaaPhrase([
        { year: 2026, place: 2, classification: "3A" },
        { year: 2025, place: 5, classification: "3A" },
      ]),
    ).toBe("NCHSAA 3A 2nd '26 · 5th '25")
  })

  it("still names it when a lone placement is all there is", () => {
    expect(nchsaaPhrase([{ year: 2026, place: 2, classification: "4A" }])).toBe("NCHSAA 4A 2nd '26")
  })

  it("ignores rows that are not a top-eight placement", () => {
    expect(nchsaaPhrase([{ year: 2026, place: null, classification: "3A" }])).toBeNull()
    expect(nchsaaPhrase([{ year: 2026, place: 12, classification: "3A" }])).toBeNull()
    expect(nchsaaPhrase([])).toBeNull()
  })
})

describe("tournamentPhrase", () => {
  it("leads with a placement and keeps the record as context", () => {
    expect(tournamentPhrase("NHSCA", [{ year: 2026, placement: "4th All-American", record: "8-2" }])).toBe(
      "NHSCA '26 4th All-American (8-2)",
    )
  })

  it("shows only the most recent trip when nothing placed", () => {
    // The common case in this field: an empty placement and a losing record. Two of these would
    // fill the entry with nothing worth reading.
    expect(
      tournamentPhrase("NHSCA", [
        { year: 2026, placement: "", record: "2-2" },
        { year: 2025, placement: "", record: "1-2" },
      ]),
    ).toBe("NHSCA '26 (2-2)")
  })

  it("prefers placements over more recent unplaced years", () => {
    expect(
      tournamentPhrase("Super 32", [
        { year: 2026, placement: "", record: "1-2" },
        { year: 2025, placement: "7th", record: "6-2" },
      ]),
    ).toBe("Super 32 '25 7th (6-2)")
  })

  it("keeps at most two placements", () => {
    const phrase = tournamentPhrase("NHSCA", [
      { year: 2026, placement: "3rd", record: "7-1" },
      { year: 2025, placement: "5th", record: "6-2" },
      { year: 2024, placement: "8th", record: "5-3" },
    ])
    expect(phrase).toBe("NHSCA '26 3rd (7-1) · NHSCA '25 5th (6-2)")
  })

  it("returns null when there is nothing at all", () => {
    expect(tournamentPhrase("NHSCA", [])).toBeNull()
    expect(tournamentPhrase("NHSCA", [{ year: 2026, placement: "", record: "" }])).toBeNull()
  })
})

describe("topSignificantWins", () => {
  it("prints an opponent once however often they were beaten", () => {
    // Straight from the field: Ayden Sumners beat David Lambright twice, and the line read
    // "David Lambright, David Lambright".
    const wins = topSignificantWins(
      [
        { opponent: "David Lambright", reason: "ranked" as const },
        { opponent: "David Lambright", reason: "ranked" as const },
      ],
      2,
    )
    expect(wins).toHaveLength(1)
    expect(wins[0].opponent).toBe("David Lambright")
  })

  it("keeps the strongest reason when the same opponent qualifies two ways", () => {
    const wins = topSignificantWins(
      [
        { opponent: "Gage Klee", reason: "ranked" as const },
        { opponent: "Gage Klee", reason: "toc-field" as const },
      ],
      2,
    )
    expect(wins).toEqual([{ opponent: "Gage Klee", reason: "toc-field" }])
  })

  it("orders by credential, not by recency", () => {
    const wins = topSignificantWins(
      [
        { opponent: "A", reason: "ranked" as const },
        { opponent: "B", reason: "national-ranked" as const },
        { opponent: "C", reason: "toc-field" as const },
      ],
      3,
    )
    expect(wins.map((w) => w.opponent)).toEqual(["B", "C", "A"])
  })

  it("respects the cap and ignores nameless rows", () => {
    expect(topSignificantWins([{ opponent: "  ", reason: "ranked" as const }], 2)).toEqual([])
    expect(
      topSignificantWins(
        [
          { opponent: "A", reason: "ranked" as const },
          { opponent: "B", reason: "ranked" as const },
          { opponent: "C", reason: "ranked" as const },
        ],
        2,
      ),
    ).toHaveLength(2)
  })
})

describe("formatWin", () => {
  it("names why the win counts", () => {
    expect(formatWin({ opponent: "Liam Myles", reason: "toc-field" })).toBe("Liam Myles (TOC field)")
    expect(formatWin({ opponent: "Gage Klee", reason: "ranked" })).toBe("Gage Klee (NC ranked)")
    expect(
      formatWin({ opponent: "Sam Reed", reason: "national-ranked", nationalRankLabel: "#12 Sports Illustrated" }),
    ).toBe("Sam Reed (#12 Sports Illustrated)")
  })

  it("falls back when a national win carries no label", () => {
    expect(formatWin({ opponent: "Sam Reed", reason: "national-ranked" })).toBe("Sam Reed (nationally ranked)")
  })
})

describe("ordinal", () => {
  it("handles the teens, which are the ones that break naive rules", () => {
    expect(ordinal(11)).toBe("11th")
    expect(ordinal(12)).toBe("12th")
    expect(ordinal(13)).toBe("13th")
    expect(ordinal(1)).toBe("1st")
    expect(ordinal(2)).toBe("2nd")
    expect(ordinal(3)).toBe("3rd")
    expect(ordinal(4)).toBe("4th")
  })
})
