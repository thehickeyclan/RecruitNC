import { describe, expect, it } from "vitest"
import {
  applyClubCorrections,
  buildAthleteIndex,
  correctClub,
  matchAthlete,
  nameParts,
  canonicalRound,
  isFinalsRound,
  isThirdPlaceRound,
  parseTournament,
  roundOrder,
  type MatchableAthlete,
  type SourceBoutRow,
} from "@/lib/other-tournament-import"

function bout(partial: Partial<SourceBoutRow>): SourceBoutRow {
  return {
    date: "9/5/2026",
    weight: "106",
    round: "Round of 32",
    winningWrestler: "",
    winningTeam: "",
    result: "",
    winType: "DEC",
    losingWrestler: "",
    losingTeam: "",
    city: "Eden",
    state: "NC",
    event: "NC Super 32 Early Entry",
    ...partial,
  }
}

/** A complete 4-man bracket: two semis, a 3rd-place match, and a final. */
const MINI_BRACKET: SourceBoutRow[] = [
  bout({ round: "Semi-Finals", winningWrestler: "Al Gold", winningTeam: "Red", losingWrestler: "Bo Bronze", losingTeam: "Blue", result: "6-0" }),
  bout({ round: "Semi-Finals", winningWrestler: "Cy Silver", winningTeam: "Green", losingWrestler: "Dee Fourth", losingTeam: "Grey", result: "3-2" }),
  bout({ round: "3rd Place", winningWrestler: "Bo Bronze", winningTeam: "Blue", losingWrestler: "Dee Fourth", losingTeam: "Grey", result: "9-1", winType: "MD" }),
  bout({ round: "Finals", winningWrestler: "Al Gold", winningTeam: "Red", losingWrestler: "Cy Silver", losingTeam: "Green", result: "5-3" }),
]

describe("parseTournament", () => {
  it("assigns 1st-4th from the finals and third-place match", () => {
    const { athletes } = parseTournament(MINI_BRACKET)
    const placements = Object.fromEntries(athletes.map((a) => [a.athleteName, a.placement]))
    expect(placements).toEqual({ "Al Gold": 1, "Cy Silver": 2, "Bo Bronze": 3, "Dee Fourth": 4 })
  })

  it("flags the top four as qualified for Super 32 entry", () => {
    const { athletes } = parseTournament([
      ...MINI_BRACKET,
      bout({ round: "Round of 32", winningWrestler: "Al Gold", winningTeam: "Red", losingWrestler: "Ed Fifth", losingTeam: "Black" }),
    ])
    const qualified = athletes.filter((a) => a.qualified).map((a) => a.athleteName)
    expect(qualified.sort()).toEqual(["Al Gold", "Bo Bronze", "Cy Silver", "Dee Fourth"])
    expect(athletes.find((a) => a.athleteName === "Ed Fifth")?.qualified).toBe(false)
  })

  it("builds records from real bouts only — a bye is never a win", () => {
    const { athletes } = parseTournament([
      bout({ winningWrestler: "Solo Kid", winningTeam: "Red", winType: "BYE", losingWrestler: "" }),
      bout({ round: "Round of 16", winningWrestler: "Solo Kid", winningTeam: "Red", losingWrestler: "Rival Kid", losingTeam: "Blue", result: "4-1" }),
      bout({ round: "Quarter-Finals", winningWrestler: "Rival Kid", winningTeam: "Blue", losingWrestler: "Solo Kid", losingTeam: "Red", result: "2-1" }),
    ])
    const solo = athletes.find((a) => a.athleteName === "Solo Kid")!
    expect(solo.record).toBe("1-1")
    expect(solo.byes).toBe(1)
    expect(solo.wins).toBe(1)
  })

  it("records each bout from both sides so direct wins are queryable either way", () => {
    const { bouts } = parseTournament([
      bout({ winningWrestler: "Al Gold", winningTeam: "Red", losingWrestler: "Bo Bronze", losingTeam: "Blue", result: "6-0" }),
    ])
    expect(bouts).toHaveLength(2)
    const winnerSide = bouts.find((b) => b.athleteName === "Al Gold")!
    const loserSide = bouts.find((b) => b.athleteName === "Bo Bronze")!
    expect(winnerSide.win).toBe(true)
    expect(winnerSide.opponentName).toBe("Bo Bronze")
    expect(loserSide.win).toBe(false)
    expect(loserSide.opponentName).toBe("Al Gold")
    expect(loserSide.score).toBe("6-0")
  })

  it("counts the field size at each weight", () => {
    const { entrantsByWeight, athletes } = parseTournament(MINI_BRACKET)
    expect(entrantsByWeight["106"]).toBe(4)
    expect(athletes.every((a) => a.entrants === 4)).toBe(true)
  })

  it("separates two brackets that share one weight label", () => {
    // The VA leg ran a youth and a high-school bracket both labelled 106. Nobody crossed
    // between them, so each wrestler's field size is their own bracket, not the sum.
    const { athletes } = parseTournament([
      ...MINI_BRACKET,
      bout({ round: "Semifinal", winningWrestler: "Zed Youth", winningTeam: "Youth", losingWrestler: "Yan Youth", losingTeam: "Youth", result: "4-0" }),
      bout({ round: "1st Place Match", winningWrestler: "Zed Youth", winningTeam: "Youth", losingWrestler: "Yan Youth", losingTeam: "Youth", result: "7-2" }),
    ])
    const bySize = Object.fromEntries(athletes.map((a) => [a.athleteName, a.entrants]))
    expect(bySize["Al Gold"]).toBe(4)
    expect(bySize["Zed Youth"]).toBe(2)
    // Both brackets legitimately crown a champion at the same weight label.
    expect(athletes.filter((a) => a.placement === 1).map((a) => a.athleteName).sort()).toEqual([
      "Al Gold",
      "Zed Youth",
    ])
  })

  it("keeps same-named wrestlers on different teams apart", () => {
    const { athletes } = parseTournament([
      bout({ winningWrestler: "John Smith", winningTeam: "Red", losingWrestler: "John Smith", losingTeam: "Blue", result: "7-2" }),
    ])
    expect(athletes).toHaveLength(2)
    expect(athletes.map((a) => a.record).sort()).toEqual(["0-1", "1-0"])
  })

  it("orders bouts by bracket progression", () => {
    expect(roundOrder("Round of 32")).toBeLessThan(roundOrder("Quarter-Finals"))
    expect(roundOrder("Quarter-Finals")).toBeLessThan(roundOrder("Semi-Finals"))
    expect(roundOrder("Semi-Finals")).toBeLessThan(roundOrder("Finals"))
  })
})

describe("round vocabularies", () => {
  it("maps the VA labels onto the NC ones", () => {
    expect(canonicalRound("1st Place Match")).toBe("Finals")
    expect(canonicalRound("3rd Place Match")).toBe("3rd Place")
    expect(canonicalRound("Quarterfinal")).toBe("Quarter-Finals")
    expect(canonicalRound("Semifinal")).toBe("Semi-Finals")
    expect(canonicalRound("Cons. Semi")).toBe("Consi-Semis")
  })

  it("recognises the deciding bouts under either vocabulary", () => {
    expect(isFinalsRound("Finals")).toBe(true)
    expect(isFinalsRound("1st Place Match")).toBe(true)
    expect(isThirdPlaceRound("3rd Place")).toBe(true)
    expect(isThirdPlaceRound("3rd Place Match")).toBe(true)
    expect(isFinalsRound("Semi-Finals")).toBe(false)
  })

  it("orders numbered preliminary rounds before the quarterfinals", () => {
    expect(roundOrder("Champ. Round 1")).toBeLessThan(roundOrder("Champ. Round 3"))
    expect(roundOrder("Champ. Round 3")).toBeLessThan(roundOrder("Quarterfinal"))
    expect(roundOrder("Quarterfinal")).toBeLessThan(roundOrder("Semifinal"))
    expect(roundOrder("Semifinal")).toBeLessThan(roundOrder("1st Place Match"))
  })

  it("passes an unknown label through unchanged rather than dropping the bout", () => {
    expect(canonicalRound("Consi of 16 #1")).toBe("Consi of 16 #1")
  })
})

describe("parseTournament with the VA bracket vocabulary", () => {
  const VA_BRACKET: SourceBoutRow[] = [
    bout({ round: "Semifinal", winningWrestler: "Al Gold", winningTeam: "Red", losingWrestler: "Bo Bronze", losingTeam: "Blue", result: "6-0" }),
    bout({ round: "Semifinal", winningWrestler: "Cy Silver", winningTeam: "Green", losingWrestler: "Dee Fourth", losingTeam: "Grey", result: "3-2" }),
    bout({ round: "3rd Place Match", winningWrestler: "Bo Bronze", winningTeam: "Blue", losingWrestler: "Dee Fourth", losingTeam: "Grey", result: "9-1", winType: "MD" }),
    bout({ round: "1st Place Match", winningWrestler: "Al Gold", winningTeam: "Red", losingWrestler: "Cy Silver", losingTeam: "Green", result: "5-3" }),
  ]

  it("assigns 1st-4th from '1st Place Match' and '3rd Place Match'", () => {
    const { athletes } = parseTournament(VA_BRACKET)
    const placements = Object.fromEntries(athletes.map((a) => [a.athleteName, a.placement]))
    expect(placements).toEqual({ "Al Gold": 1, "Cy Silver": 2, "Bo Bronze": 3, "Dee Fourth": 4 })
    expect(athletes.filter((a) => a.qualified)).toHaveLength(4)
  })

  it("stores the canonical round alongside the label the bracket printed", () => {
    const { bouts } = parseTournament(VA_BRACKET)
    const final = bouts.find((b) => b.sourceRound === "1st Place Match")!
    expect(final.round).toBe("Finals")
  })

  it("sorts a range-weight bracket without producing NaN", () => {
    const { athletes } = parseTournament([
      bout({ weight: "62-71", winningWrestler: "Light Kid", winningTeam: "Red", losingWrestler: "Other Kid", losingTeam: "Blue" }),
      bout({ weight: "106", winningWrestler: "Big Kid", winningTeam: "Red", losingWrestler: "Third Kid", losingTeam: "Blue" }),
    ])
    expect(athletes.map((a) => a.weightClass)[0]).toBe("62-71")
    expect(athletes).toHaveLength(4)
  })
})

describe("club corrections", () => {
  const VA = "super32-early-entry-va-2026"

  it("fixes the entry the bracket mistyped", () => {
    expect(correctClub(VA, "Gavin Hickey", "Roanoke Area Wrestling")).toBe("Raleigh Area Wrestling")
  })

  it("leaves the same club alone for wrestlers the correction does not name", () => {
    expect(correctClub(VA, "Brady Booth", "Roanoke Area Wrestling")).toBe("Roanoke Area Wrestling")
  })

  it("does not leak a correction into another event", () => {
    expect(correctClub("super32-early-entry-nc-2026", "Gavin Hickey", "Roanoke Area Wrestling")).toBe(
      "Roanoke Area Wrestling",
    )
  })

  it("rewrites the team on both sides of a bout so the athlete stays one person", () => {
    const rows = applyClubCorrections(
      [
        bout({ winningWrestler: "Gavin Hickey", winningTeam: "Roanoke Area Wrestling", losingWrestler: "Some Kid", losingTeam: "Blue" }),
        bout({ winningWrestler: "Some Kid", winningTeam: "Blue", losingWrestler: "Gavin Hickey", losingTeam: "Roanoke Area Wrestling" }),
      ],
      VA,
    )
    expect(rows[0]!.winningTeam).toBe("Raleigh Area Wrestling")
    expect(rows[1]!.losingTeam).toBe("Raleigh Area Wrestling")

    const { athletes } = parseTournament(rows)
    const hickey = athletes.filter((a) => a.athleteName === "Gavin Hickey")
    expect(hickey).toHaveLength(1)
    expect(hickey[0]!.record).toBe("1-1")
    expect(hickey[0]!.club).toBe("Raleigh Area Wrestling")
  })
})

describe("nameParts", () => {
  it("drops generational suffixes", () => {
    expect(nameParts("Kristopher Kerr Jr.")).toEqual({ first: "kristopher", last: "kerr" })
    expect(nameParts("Mark Brown III")).toEqual({ first: "mark", last: "brown" })
  })

  it("rejects a name with no last name", () => {
    expect(nameParts("Unattached")).toBeNull()
  })
})

describe("matchAthlete", () => {
  const roster: MatchableAthlete[] = [
    { id: "1", name: "Tobin McNair", highschool: "Cardinal Gibbons", wrestlingClub: "Capital City", graduationyear: 2027 },
    { id: "2", name: "Chris Gaither", highschool: "West Rowan", wrestlingClub: null, graduationyear: 2028 },
    { id: "3", name: "Connor Byrd", highschool: "Bandys", wrestlingClub: null, graduationyear: 2024 },
    { id: "4", name: "Jacob Campos", highschool: "White Oak", wrestlingClub: "Sly Fox", graduationyear: 2027 },
    { id: "5", name: "James Campos", highschool: "White Oak", wrestlingClub: "Sly Fox", graduationyear: 2026 },
    { id: "6", name: "Gabriel Jones", highschool: "East Surry", wrestlingClub: "Combat", graduationyear: 2027 },
    { id: "7", name: "Gabriel Jones", highschool: "East Surry", wrestlingClub: null, graduationyear: null },
    { id: "8", name: "Luke Richards", highschool: "Cardinal Gibbons", wrestlingClub: "RAW", graduationyear: 2028 },
    { id: "9", name: "Luke Richards", highschool: null, wrestlingClub: null, graduationyear: null },
  ]
  const index = buildAthleteIndex(roster)

  it("matches an exact first and last name", () => {
    const result = matchAthlete("Tobin McNair", "Capital City Wrestling Club", index)
    expect(result).toMatchObject({ status: "matched", tier: "exact" })
  })

  it("matches a known nickname", () => {
    const result = matchAthlete("Christopher Gaither", "Believe to Achieve WC", index)
    expect(result).toMatchObject({ status: "matched", tier: "nickname" })
    expect(result.status === "matched" && result.athlete.id).toBe("2")
  })

  it("never matches on a shared last name and a different first name", () => {
    // "Catoe Byrd" is a different kid from "Connor Byrd" — a first-initial match
    // would write one wrestler's results onto the other's profile.
    expect(matchAthlete("Catoe Byrd", "Valebound Wrestling Club", index)).toEqual({
      status: "unmatched",
      reason: "no_candidate",
    })
    expect(matchAthlete("Justin Campos", "Sly fox", index)).toEqual({
      status: "unmatched",
      reason: "no_candidate",
    })
  })

  it("collapses duplicate rows for the same kid onto the most complete profile", () => {
    const result = matchAthlete("Gabriel Jones", "East Surry", index)
    expect(result).toMatchObject({ status: "matched" })
    expect(result.status === "matched" && result.athlete.id).toBe("6")
  })

  it("prefers a filled-in profile over an empty duplicate of the same name", () => {
    const result = matchAthlete("Luke Richards", "Raleigh Area Wrestling", index)
    expect(result).toMatchObject({ status: "matched" })
    expect(result.status === "matched" && result.athlete.id).toBe("8")
  })

  it("uses the source team to pick between same-named profiles", () => {
    const namesakes: MatchableAthlete[] = [
      { id: "x", name: "Ray Vance", highschool: "Union Pines", wrestlingClub: null, graduationyear: 2027 },
      { id: "y", name: "Ray Vance", highschool: "Cape Fear", wrestlingClub: null, graduationyear: 2028 },
    ]
    const result = matchAthlete("Ray Vance", "Cape Fear", buildAthleteIndex(namesakes))
    expect(result.status === "matched" && result.athlete.id).toBe("y")
  })

  it("reports genuinely different people as ambiguous rather than guessing", () => {
    const twins: MatchableAthlete[] = [
      { id: "a", name: "Sam Stone", highschool: "North", wrestlingClub: null, graduationyear: 2027 },
      { id: "b", name: "Sam Stone", highschool: "South", wrestlingClub: null, graduationyear: 2028 },
    ]
    const result = matchAthlete("Sam Stone", "Unattached", buildAthleteIndex(twins))
    expect(result.status).toBe("ambiguous")
  })

  it("does not match a name it cannot parse", () => {
    expect(matchAthlete("Unattached", "Unattached", index)).toEqual({
      status: "unmatched",
      reason: "unparseable",
    })
  })
})
