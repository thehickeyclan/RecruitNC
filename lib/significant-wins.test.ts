import { describe, expect, it } from "vitest"
import { findSignificantLosses, findSignificantWins, isLoss, isWin, withAccoladesOnly, type OpponentIndex } from "./significant-wins"

const index: OpponentIndex = {
  tocField: ["Adam Walker", "Liam Myles"],
  ranked: [
    { name: "Jack Gilson", ranking: 7, graduationYear: 2029 },
    { name: "Brandon Lefler", ranking: 5, graduationYear: 2029 },
  ],
}

const bout = (over: Partial<Parameters<typeof findSignificantWins>[0][number]> = {}) => ({
  opponent: "Adam Walker",
  win_loss: "W",
  date: "3/14/2026",
  venue: "Interstate 64 Spring Duals",
  result: "DEC",
  weight: 113,
  opponent_school: "Holly Springs",
  ...over,
})

describe("findSignificantWins", () => {
  it("keeps a win over somebody in the TOC field", () => {
    const wins = findSignificantWins([bout()], index)
    expect(wins).toHaveLength(1)
    expect(wins[0]).toMatchObject({ opponent: "Adam Walker", reason: "toc-field", event: "Interstate 64 Spring Duals" })
  })

  it("keeps a win over a ranked prospect from an unpublished class", () => {
    const wins = findSignificantWins([bout({ opponent: "Jack Gilson" })], index)
    expect(wins[0]).toMatchObject({ reason: "ranked", opponentGraduationYear: 2029 })
  })

  it("drops a win over nobody in particular", () => {
    expect(findSignificantWins([bout({ opponent: "Some Kid" })], index)).toEqual([])
  })

  it("drops losses, however they are spelled", () => {
    expect(findSignificantWins([bout({ win_loss: "L" })], index)).toEqual([])
    expect(findSignificantWins([bout({ win_loss: null, result: "LOSS" })], index)).toEqual([])
  })

  it("does not credit a win over a name that merely looks similar", () => {
    expect(findSignificantWins([bout({ opponent: "Adam Walkerson" })], index)).toEqual([])
  })

  it("counts the same opponent on different days separately", () => {
    const wins = findSignificantWins([bout(), bout({ date: "11/15/2025" })], index)
    expect(wins).toHaveLength(2)
  })

  it("collapses the same bout stored twice", () => {
    expect(findSignificantWins([bout(), bout()], index)).toHaveLength(1)
  })

  it("puts TOC opponents first, then the most recent", () => {
    const wins = findSignificantWins(
      [
        bout({ opponent: "Jack Gilson", date: "3/20/2026" }),
        bout({ opponent: "Adam Walker", date: "11/15/2025" }),
        bout({ opponent: "Liam Myles", date: "3/14/2026" }),
      ],
      index,
    )
    expect(wins.map((w) => w.opponent)).toEqual(["Liam Myles", "Adam Walker", "Jack Gilson"])
  })

  it("sinks an undated win rather than letting it lead", () => {
    const wins = findSignificantWins(
      [bout({ opponent: "Jack Gilson", date: null }), bout({ opponent: "Brandon Lefler", date: "3/14/2026" })],
      index,
    )
    expect(wins.map((w) => w.opponent)).toEqual(["Brandon Lefler", "Jack Gilson"])
  })

  it("reads an opponent stored under the other field name", () => {
    const wins = findSignificantWins([{ opponent_name: "Adam Walker", win_loss: "W" }], index)
    expect(wins).toHaveLength(1)
  })
})

describe("nationally ranked opponents", () => {
  const withNational: OpponentIndex = {
    ...index,
    nationallyRanked: [
      { name: "Melvin Miller", rank: 1, source: "Sports Illustrated", state: "PA" },
      { name: "Adam Walker", rank: 12, source: "MatScouts", state: "NC" },
    ],
  }

  it("counts a win over an out-of-state nationally ranked wrestler", () => {
    // Most opponents worth naming will never be in our own athlete table.
    const wins = findSignificantWins([bout({ opponent: "Melvin Miller" })], withNational)
    expect(wins).toHaveLength(1)
    expect(wins[0]).toMatchObject({ reason: "national-ranked", nationalRankLabel: "#1 Sports Illustrated" })
  })

  it("ranks a national credential above the TOC field for the same opponent", () => {
    // Adam Walker is in both lists; the stronger credential should win.
    const wins = findSignificantWins([bout({ opponent: "Adam Walker" })], withNational)
    expect(wins[0]).toMatchObject({ reason: "national-ranked" })
  })

  it("leads the list with nationally ranked wins", () => {
    const wins = findSignificantWins(
      [bout({ opponent: "Liam Myles", date: "3/20/2026" }), bout({ opponent: "Melvin Miller", date: "1/2/2026" })],
      withNational,
    )
    expect(wins.map((w) => w.reason)).toEqual(["national-ranked", "toc-field"])
  })

  it("still works when no national list is supplied", () => {
    expect(findSignificantWins([bout()], index)).toHaveLength(1)
  })

  it("names nationally ranked losses too", () => {
    const losses = findSignificantLosses([bout({ opponent: "Melvin Miller", win_loss: "L" })], withNational)
    expect(losses[0]).toMatchObject({ reason: "national-ranked" })
  })
})

describe("opponentRanking", () => {
  it("carries the opponent's North Carolina ranking for a state-ranked opponent", () => {
    const wins = findSignificantWins([bout({ opponent: "Jack Gilson" })], index)
    expect(wins[0].opponentRanking).toBe(7)
  })

  it("is null for a TOC-field opponent who carries no prospect ranking", () => {
    const wins = findSignificantWins([bout()], index)
    expect(wins[0].opponentRanking).toBeNull()
  })

  it("carries the ranking on losses too", () => {
    const losses = findSignificantLosses([bout({ opponent: "Brandon Lefler", win_loss: "L" })], index)
    expect(losses[0].opponentRanking).toBe(5)
  })
})

describe("findSignificantLosses", () => {
  it("keeps a loss to somebody in the TOC field", () => {
    const losses = findSignificantLosses([bout({ win_loss: "L" })], index)
    expect(losses).toHaveLength(1)
    expect(losses[0]).toMatchObject({ opponent: "Adam Walker", reason: "toc-field" })
  })

  it("keeps a loss to a ranked prospect", () => {
    const losses = findSignificantLosses([bout({ opponent: "Jack Gilson", win_loss: "L" })], index)
    expect(losses).toHaveLength(1)
    expect(losses[0]).toMatchObject({ reason: "ranked" })
  })

  it("ignores a loss to somebody nobody has heard of", () => {
    expect(findSignificantLosses([bout({ opponent: "Unknown Kid", win_loss: "L" })], index)).toEqual([])
  })

  it("does not report wins as losses, or losses as wins", () => {
    const bouts = [bout({ win_loss: "W" }), bout({ opponent: "Liam Myles", win_loss: "L" })]
    expect(findSignificantWins(bouts, index).map((w) => w.opponent)).toEqual(["Adam Walker"])
    expect(findSignificantLosses(bouts, index).map((w) => w.opponent)).toEqual(["Liam Myles"])
  })

  it("collapses the same loss stored twice", () => {
    const twice = [bout({ win_loss: "L" }), bout({ win_loss: "L" })]
    expect(findSignificantLosses(twice, index)).toHaveLength(1)
  })
})

describe("isLoss", () => {
  it("reads the spellings a bout row actually uses", () => {
    expect(isLoss({ win_loss: "L" })).toBe(true)
    expect(isLoss({ result: "LOSS" })).toBe(true)
    expect(isLoss({ win_loss: "W" })).toBe(false)
    expect(isLoss({ win_loss: "" })).toBe(false)
  })
})

describe("isWin", () => {
  it.each(["W", "w", "WIN", "W 5-2"])("reads %s as a win", (v) => expect(isWin({ win_loss: v })).toBe(true))
  it.each(["L", "LOSS", "", null])("does not read %s as a win", (v) => expect(isWin({ win_loss: v })).toBe(false))
})

describe("state champions and placers", () => {
  const index = {
    tocField: [],
    ranked: [],
    statePlacers: [
      { name: "Jay Mills", schools: ["Lincolnton"], finishes: [{ year: 2026, place: 2, classification: "3A" }, { year: 2025, place: 5, classification: "2A" }] },
      { name: "Rylin Walker", schools: ["South Caldwell"], finishes: [{ year: 2026, place: 3, classification: "6A" }] },
      { name: "Carson Worrick", schools: ["Alleghany", "Davie"], finishes: [{ year: 2026, place: 1, classification: "7A" }, { year: 2025, place: 1, classification: "1A" }, { year: 2024, place: 3, classification: "1A" }] },
      { name: "Joshua Wilson", schools: ["Richlands"], finishes: [{ year: 2020, place: 2, classification: "3A" }] },
    ],
  }
  const win = (opponent: string, school: string | null, date = "1/10/2026") =>
    ({ opponent, opponent_school: school, win_loss: "W", result: "Dec 5-2", date, venue: "Somewhere" })

  it("counts a win over a state champion or placer", () => {
    const wins = findSignificantWins([win("Carson Worrick", "Davie"), win("Rylin Walker", "South Caldwell")], index)
    expect(wins.map((w) => [w.opponent, w.reason, w.stateLabel])).toEqual([
      ["Carson Worrick", "state-champion", "2x State Champion (2026 7A)"],
      ["Rylin Walker", "state-placer", "2026 6A State 3rd"],
    ])
  })

  it("follows a transfer through every school the name placed for", () => {
    expect(findSignificantWins([win("Carson Worrick", "Alleghany")], index)).toHaveLength(1)
  })

  it("does not credit a namesake at a different known NC school", () => {
    const withSchools = { ...index, stateSchools: ["Lincolnton", "Hoke County", "South Caldwell"] }
    expect(findSignificantWins([win("Jay Mills", "Hoke County")], withSchools)).toEqual([])
  })

  it("treats a club or unknown school as no evidence", () => {
    const withSchools = { ...index, stateSchools: ["Lincolnton", "Hoke County"] }
    expect(findSignificantWins([win("Jay Mills", "Catawba Rasslin")], withSchools)).toHaveLength(1)
  })

  it("trusts the name when the bout has no school", () => {
    expect(findSignificantWins([win("Jay Mills", null)], index)).toHaveLength(1)
  })

  it("stateOnly ignores the other reasons", () => {
    const withRanked = { ...index, ranked: [{ name: "Some Ranked Kid", ranking: 3, graduationYear: 2027 }] }
    expect(findSignificantWins([win("Some Ranked Kid", "Apex")], withRanked, { stateOnly: true })).toEqual([])
    expect(findSignificantWins([win("Some Ranked Kid", "Apex")], withRanked)).toHaveLength(1)
  })

  it("ignores a finish from outside a four-season career", () => {
    // The 2020 runner-up is not the Richlands wrestler beaten in 2026.
    expect(findSignificantWins([win("Joshua Wilson", "Richlands", "2/14/2026")], index)).toEqual([])
    expect(findSignificantWins([win("Joshua Wilson", "Richlands", "2/14/2021")], index)).toHaveLength(1)
  })

  it("keeps the stronger reason and still carries the state finish", () => {
    const both = { ...index, tocField: ["Jay Mills"] }
    const [w] = findSignificantWins([win("Jay Mills", "Lincolnton")], both)
    expect(w.reason).toBe("toc-field")
    expect(w.stateLabel).toBe("2026 3A State Runner-up")
  })
})

describe("withAccoladesOnly", () => {
  const base = { opponentSchool: null, event: null, date: null, result: null, weight: null, opponentGraduationYear: null }
  it("drops a TOC-field win with no ranking or state finish, and relabels one that has either", () => {
    const out = withAccoladesOnly([
      { ...base, opponent: "Invitee Only", reason: "toc-field", opponentRanking: null },
      { ...base, opponent: "Ranked Invitee", reason: "toc-field", opponentRanking: 7 },
      { ...base, opponent: "Placer Invitee", reason: "toc-field", opponentRanking: null, stateLabel: "2026 6A State Runner-up" },
      { ...base, opponent: "Champ Invitee", reason: "toc-field", opponentRanking: null, stateLabel: "2026 8A State Champion" },
      { ...base, opponent: "Nat", reason: "national-ranked", opponentRanking: null },
    ])
    expect(out.map((w) => [w.opponent, w.reason])).toEqual([
      ["Ranked Invitee", "ranked"],
      ["Placer Invitee", "state-placer"],
      ["Champ Invitee", "state-champion"],
      ["Nat", "national-ranked"],
    ])
  })
})

describe("other states' placers", () => {
  const va = (name: string, school: string, place: number, cls: string, identityConfirmed = false) => ({
    name,
    schools: [school],
    state: "VA",
    identityConfirmed,
    finishes: [{ year: 2026, place, classification: cls, state: "VA" }],
  })
  const index = {
    tocField: [],
    ranked: [],
    statePlacers: [
      va("Canaan Spears", "Union", 1, "2A"),
      va("Gavin Walker", "Grayson County", 6, "1A"),
      va("Levi Wright", "Glenvar", 1, "2A", true),
    ],
    // North Carolina's high schools, as the state results list them.
    stateSchools: ["Mooresville", "West Craven", "East Wilkes"],
  }
  const win = (opponent: string, school: string | null) =>
    ({ opponent, opponent_school: school, win_loss: "W", result: "Dec", date: "12/6/2025", venue: "Somewhere" })

  it("credits a win when the bout carries his school, and labels the state", () => {
    const [w] = findSignificantWins([win("Canaan Spears", "Union (VA)")], index)
    expect(w.reason).toBe("state-champion")
    expect(w.stateLabel).toBe("2026 VA 2A State Champion")
    expect(w.opponentState).toBe("VA")
  })

  it("credits a win when the bout lists only his state", () => {
    expect(findSignificantWins([win("Canaan Spears", "VA")], index)).toHaveLength(1)
  })

  it("does not hand a Virginia placing to a North Carolina namesake", () => {
    expect(findSignificantWins([win("Gavin Walker", "Mooresville")], index)).toEqual([])
  })

  it("needs evidence for a club-only line when the name is unconfirmed", () => {
    expect(findSignificantWins([win("Gavin Walker", "OTM Walters Wrestling")], index)).toEqual([])
  })

  it("accepts a club-only line for a name another bout has confirmed", () => {
    expect(findSignificantWins([win("Levi Wright", "Noke Wrestling RTC")], index)).toHaveLength(1)
  })

  it("still refuses a confirmed name at a North Carolina school", () => {
    expect(findSignificantWins([win("Levi Wright", "East Wilkes")], index)).toEqual([])
  })
  it("narrows by name word without losing a nickname or an alias-group spelling", () => {
    const narrowed = {
      ...index,
      statePlacers: [va("Zachary Miracle", "Hudsonville", 2, "D1", true), va("Holton Quickny", "Harlan", 1, "1A", true), ...index.statePlacers],
    }
    // Zach / Zachary share the surname; Quincy / Quickny share no word but are an alias group.
    expect(findSignificantWins([win("Zach Miracle", "VA")], narrowed)).toHaveLength(1)
    expect(findSignificantWins([win("Holt Quincy", "VA")], narrowed)).toHaveLength(1)
  })
})

describe("nationally ranked opponents with a school on file", () => {
  const index = {
    tocField: [],
    ranked: [],
    nationallyRanked: [{ name: "Marcus Killgore", rank: 9, source: "Sports Illustrated (150)", state: "AZ", school: "Sahuarita" }],
    stateSchools: ["Mooresville"],
  }
  const win = (school: string | null) =>
    ({ opponent: "Marcus Killgore", opponent_school: school, win_loss: "W", result: "DEC 4-1", date: "5/23/2026", venue: "Duals" })

  it("credits the ranking when the bout lists his state", () => {
    const [w] = findSignificantWins([win("AZ")], index)
    expect(w.reason).toBe("national-ranked")
    expect(w.nationalRankLabel).toBe("#9 Sports Illustrated (150)")
  })

  it("credits it on his school", () => {
    expect(findSignificantWins([win("Sahuarita High School")], index)).toHaveLength(1)
  })

  it("refuses the name alone, and a North Carolina namesake", () => {
    expect(findSignificantWins([win("Team Gotcha - HSB")], index)).toEqual([])
    expect(findSignificantWins([win("Mooresville")], index)).toEqual([])
  })
})

describe("distinctive out-of-state names", () => {
  const wilder = {
    name: "Ryder Wilder",
    schools: ["Camden County"],
    state: "GA",
    distinctive: true,
    finishes: [{ year: 2026, place: 1, classification: "6A", state: "GA", weight: 190 }],
  }
  const index = { tocField: [], ranked: [], statePlacers: [wilder], stateSchools: ["Mooresville"] }
  const bout = (school: string | null, weight: number | null) =>
    ({ opponent: "Ryder Wilder", opponent_school: school, win_loss: "W", result: "TF", date: "6/24/2026", venue: "AAU", weight })

  it("credits a distinctive name on an all-star team when the weight fits", () => {
    const [w] = findSignificantWins([bout("Spec Ops (FL)", 215)], index)
    expect(w.stateLabel).toBe("2026 GA 6A State Champion")
  })

  it("refuses it at a weight he could not have wrestled", () => {
    expect(findSignificantWins([bout("Spec Ops (FL)", 132)], index)).toEqual([])
  })

  it("refuses it with no weight, and at a North Carolina school", () => {
    expect(findSignificantWins([bout("Spec Ops (FL)", null)], index)).toEqual([])
    expect(findSignificantWins([bout("Mooresville", 190)], index)).toEqual([])
  })

  it("never treats a shared name as distinctive", () => {
    const shared = { ...index, statePlacers: [{ ...wilder, distinctive: false }] }
    expect(findSignificantWins([bout("Spec Ops (FL)", 190)], shared)).toEqual([])
  })
})
