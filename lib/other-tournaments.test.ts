import { describe, expect, it } from "vitest"
import {
  buildStrengthOfWins,
  displayName,
  getOtherTournamentBoutsForAthleteRecord,
  getOtherTournamentResultsForAthleteRecord,
  credentialKey,
  isNotableWin,
  loadQualifierHeadToHead,
  placementLabel,
  scoreWin,
  summarizeDirectResults,
  type OpponentCredential,
  type OtherTournamentBout,
} from "@/lib/other-tournaments"

const EVENT = "super32-early-entry-nc-2026"

function boutOf(partial: Partial<OtherTournamentBout>): OtherTournamentBout {
  return {
    eventKey: EVENT,
    eventName: "NC Super 32 Early Entry",
    year: 2026,
    weight: "157",
    round: "Round of 16",
    boutOrder: 40,
    opponentName: "Rival Kid",
    opponentClub: "Blue",
    opponentAthleteId: null,
    win: true,
    isBye: false,
    winType: "DEC",
    score: "5-3",
    ...partial,
  }
}

function credential(partial: Partial<OpponentCredential>): OpponentCredential {
  return { name: "Rival Kid", club: "Blue", placement: null, record: "2-2", qualified: false, ...partial }
}

describe("placementLabel", () => {
  it("names the top four and leaves the rest blank", () => {
    expect(placementLabel(1)).toBe("Champion")
    expect(placementLabel(2)).toBe("2nd")
    expect(placementLabel(3)).toBe("3rd")
    expect(placementLabel(4)).toBe("4th")
    expect(placementLabel(null)).toBe("")
  })
})

describe("displayName", () => {
  it("title-cases a name the bracket printed all in lower case", () => {
    expect(displayName("mason brown")).toBe("Mason Brown")
    expect(displayName("santi hidalgo")).toBe("Santi Hidalgo")
  })

  it("leaves a name that already has capitals exactly as the bracket spelled it", () => {
    expect(displayName("Jacob De La Torre")).toBe("Jacob De La Torre")
    expect(displayName("Kristopher Kerr Jr.")).toBe("Kristopher Kerr Jr.")
    expect(displayName("Stephen cross")).toBe("Stephen cross")
  })
})

describe("late-created profile qualifier lookup", () => {
  const resultRow = {
    event_key: EVENT,
    event_name: "NC Super 32 Early Entry",
    event_short_name: "Super 32 Early Entry",
    event_state: "NC",
    event_date: "2026-09-05",
    year: 2026,
    athlete_name: "Ben McCaleb",
    athlete_id: null,
    club: "Sly fox",
    weight_class: "190",
    wins: 5,
    losses: 1,
    record: "5-1",
    placement: 3,
    qualified: true,
    entrants: 10,
  }
  const boutRow = {
    ...resultRow,
    round: "3rd Place",
    bout_order: 85,
    opponent_name: "Jordan Barbee",
    opponent_club: "Orange",
    opponent_id: null,
    win: true,
    is_bye: false,
    win_type: "DEC",
    score: "5-4",
  }

  function fakeSupabase() {
    return {
      from(table: string) {
        return {
          select() {
            return {
              eq() {
                if (table === "other_tournament_bouts") {
                  return { order: () => Promise.resolve({ data: [], error: null }) }
                }
                return Promise.resolve({ data: [], error: null })
              },
              is() {
                return {
                  ilike: (_column: string, name: string) => Promise.resolve({
                    data: name === "ben mccaleb" ? [table === "other_tournament_bouts" ? boutRow : resultRow] : [],
                    error: null,
                  }),
                }
              },
            }
          },
        }
      },
    } as never
  }

  it("finds an unlinked result by name after the profile is created", async () => {
    const rows = await getOtherTournamentResultsForAthleteRecord(fakeSupabase(), {
      id: "new-profile-id",
      name: "Ben Mccaleb",
    })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ record: "5-1", placement: 3, qualified: true, weight: "190" })
  })

  it("finds the unlinked bouts needed by the profile result block", async () => {
    const rows = await getOtherTournamentBoutsForAthleteRecord(fakeSupabase(), {
      id: "new-profile-id",
      name: "Ben Mccaleb",
    })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ opponentName: "Jordan Barbee", win: true, score: "5-4" })
  })
})

describe("scoreWin", () => {
  it("ranks a win over the champion above a win over the fourth-place finisher", () => {
    const overChamp = scoreWin(credential({ placement: 1, record: "5-0" }), "DEC")
    const overFourth = scoreWin(credential({ placement: 4, record: "5-2" }), "DEC")
    expect(overChamp).toBeGreaterThan(overFourth)
  })

  it("ranks a win over a placer above a win over an unplaced wrestler", () => {
    const overPlacer = scoreWin(credential({ placement: 3, record: "5-1" }), "DEC")
    const overField = scoreWin(credential({ placement: null, record: "1-2" }), "DEC")
    expect(overPlacer).toBeGreaterThan(overField)
  })

  it("credits bonus-point wins over a decision against the same opponent", () => {
    const opponent = credential({ placement: 2, record: "4-1" })
    expect(scoreWin(opponent, "F")).toBeGreaterThan(scoreWin(opponent, "DEC"))
    expect(scoreWin(opponent, "TF")).toBeGreaterThan(scoreWin(opponent, "MD"))
  })

  it("scores a win over an unknown opponent without throwing", () => {
    expect(scoreWin(null, "DEC")).toBe(1)
  })
})

describe("isNotableWin", () => {
  it("counts wins over placers and Super 32 qualifiers", () => {
    expect(isNotableWin(credential({ placement: 2 }))).toBe(true)
    expect(isNotableWin(credential({ qualified: true }))).toBe(true)
  })

  it("counts a win over a ranked wrestler even when they did not place", () => {
    expect(isNotableWin(credential({ placement: null, prospectRanking: 7 }))).toBe(true)
  })

  it("counts a win over someone in the TOC field even when they did not place", () => {
    expect(isNotableWin(credential({ placement: null, tocParticipant: true }))).toBe(true)
  })

  it("does not count a win over an unplaced, unranked wrestler or an unknown opponent", () => {
    expect(isNotableWin(credential({}))).toBe(false)
    expect(isNotableWin(null)).toBe(false)
  })
})

describe("scoreWin with ranked and TOC opponents", () => {
  it("ranks a win over a top-ranked wrestler above one over an unranked wrestler", () => {
    const overRanked = scoreWin(credential({ prospectRanking: 2, record: "3-2" }), "DEC")
    const overUnranked = scoreWin(credential({ record: "3-2" }), "DEC")
    expect(overRanked).toBeGreaterThan(overUnranked)
  })

  it("ranks a win over #1 above a win over #25", () => {
    expect(scoreWin(credential({ prospectRanking: 1 }), "DEC")).toBeGreaterThan(
      scoreWin(credential({ prospectRanking: 25 }), "DEC"),
    )
  })

  it("credits a win over someone in the TOC field", () => {
    expect(scoreWin(credential({ tocParticipant: true }), "DEC")).toBeGreaterThan(
      scoreWin(credential({ tocParticipant: false }), "DEC"),
    )
  })
})

describe("buildStrengthOfWins", () => {
  const credentials = new Map<string, OpponentCredential>([
    [credentialKey(EVENT, "Champ Kid", "Red"), credential({ name: "Champ Kid", club: "Red", placement: 1, record: "5-0" })],
    [credentialKey(EVENT, "Rival Kid", "Blue"), credential({ name: "Rival Kid", club: "Blue", record: "1-2" })],
  ])

  it("keeps only wins, and leads with the best one", () => {
    const wins = buildStrengthOfWins(
      [
        boutOf({ opponentName: "Rival Kid", opponentClub: "Blue" }),
        boutOf({ opponentName: "Champ Kid", opponentClub: "Red", round: "Semi-Finals" }),
        boutOf({ opponentName: "Someone Else", opponentClub: "Grey", win: false }),
        boutOf({ opponentName: null, isBye: true, winType: "BYE" }),
      ],
      credentials,
    )
    expect(wins.map((w) => w.opponentName)).toEqual(["Champ Kid", "Rival Kid"])
  })

  it("attaches the opponent's finish at that same event", () => {
    const [win] = buildStrengthOfWins([boutOf({ opponentName: "Champ Kid", opponentClub: "Red" })], credentials)
    expect(win!.credential?.placement).toBe(1)
    expect(win!.credential?.record).toBe("5-0")
  })

  it("keeps a win whose opponent is not in the credential map", () => {
    const [win] = buildStrengthOfWins([boutOf({ opponentName: "Unknown Kid", opponentClub: "None" })], credentials)
    expect(win!.credential).toBeNull()
    expect(win!.opponentName).toBe("Unknown Kid")
  })

  it("credits a ranked or TOC opponent who has no row in the event results", () => {
    const facts = new Map([
      ["athlete-9", { prospectRanking: 4, graduationYear: 2028, tocParticipant: true }],
    ])
    const [win] = buildStrengthOfWins(
      [boutOf({ opponentName: "Ranked Kid", opponentClub: "Grey", opponentAthleteId: "athlete-9" })],
      credentials,
      facts,
    )
    expect(win!.credential?.prospectRanking).toBe(4)
    expect(win!.credential?.tocParticipant).toBe(true)
    expect(isNotableWin(win!.credential)).toBe(true)
  })

  it("leads with a win over a ranked wrestler ahead of an unranked one", () => {
    const facts = new Map([["athlete-9", { prospectRanking: 3, graduationYear: 2028, tocParticipant: false }]])
    const wins = buildStrengthOfWins(
      [
        boutOf({ opponentName: "Rival Kid", opponentClub: "Blue" }),
        boutOf({ opponentName: "Ranked Kid", opponentClub: "Grey", opponentAthleteId: "athlete-9" }),
      ],
      credentials,
      facts,
    )
    expect(wins[0]!.opponentName).toBe("Ranked Kid")
  })
})

describe("loadQualifierHeadToHead", () => {
  function fakeSupabase(rows: unknown[]) {
    return {
      from() {
        return { select() { return { in() { return Promise.resolve({ data: rows, error: null }) } } } }
      },
    } as never
  }
  const row = (over: Record<string, unknown>) => ({
    athlete_id: "a", opponent_id: "b", win: true, is_bye: false,
    round: "Finals", bout_order: 90, win_type: "F", score: "11-9 3:20",
    event_name: "NC Super 32 Early Entry", year: 2026, ...over,
  })

  it("pairs wrestlers by athlete id, not by name", async () => {
    const index = await loadQualifierHeadToHead(fakeSupabase([row({})]), ["a", "b"])
    expect(index.get("a")?.get("b")).toMatchObject({ wins: 1, losses: 0 })
    expect(index.get("a")?.get("b")?.summary).toContain("won F 11-9 3:20")
  })

  it("ignores byes and opponents outside the field", async () => {
    const index = await loadQualifierHeadToHead(
      fakeSupabase([row({ is_bye: true }), row({ opponent_id: "stranger" })]),
      ["a", "b"],
    )
    expect(index.size).toBe(0)
  })

  it("keeps only the most recent year, so last season does not seed this bracket", async () => {
    const index = await loadQualifierHeadToHead(
      fakeSupabase([
        row({ year: 2025, win: false, score: "2-1" }),
        row({ year: 2026, win: true, score: "11-9 3:20" }),
      ]),
      ["a", "b"],
    )
    expect(index.get("a")?.get("b")).toMatchObject({ wins: 1, losses: 0 })
  })

  it("reports the meeting that went furthest in the bracket", async () => {
    const index = await loadQualifierHeadToHead(
      fakeSupabase([
        row({ round: "Round of 32", bout_order: 30, win_type: "DEC", score: "3-1" }),
        row({ round: "Finals", bout_order: 90, win_type: "F", score: "11-9 3:20" }),
      ]),
      ["a", "b"],
    )
    const entry = index.get("a")?.get("b")
    expect(entry).toMatchObject({ wins: 2, losses: 0 })
    expect(entry?.summary).toContain("Finals")
  })

  it("returns nothing when fewer than two of the field are given", async () => {
    expect((await loadQualifierHeadToHead(fakeSupabase([row({})]), ["a"])).size).toBe(0)
  })
})

describe("summarizeDirectResults", () => {
  it("aggregates head-to-head against opponents who have profiles", () => {
    const summary = summarizeDirectResults([
      boutOf({ opponentName: "Rival Kid", opponentAthleteId: "abc", win: true }),
      boutOf({ opponentName: "Rival Kid", opponentAthleteId: "abc", win: false, round: "Consi of 8 #2" }),
      boutOf({ opponentName: "Other Kid", opponentAthleteId: "def", win: true }),
    ])
    expect(summary).toHaveLength(2)
    expect(summary[0]).toMatchObject({ opponentAthleteId: "abc", wins: 1, losses: 1 })
  })

  it("ignores byes and opponents with no profile", () => {
    const summary = summarizeDirectResults([
      boutOf({ opponentName: null, isBye: true, opponentAthleteId: null }),
      boutOf({ opponentName: "Unlinked Kid", opponentAthleteId: null }),
    ])
    expect(summary).toEqual([])
  })
})
