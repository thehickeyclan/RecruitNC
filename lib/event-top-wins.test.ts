import { describe, expect, it } from "vitest"
import { nameKey, resolveOpponent, rankWins, type Credential, type TopWin } from "@/lib/event-top-wins"

const cred = (o: Partial<Credential>): Credential => ({
  state: "VA", place: 1, season: 2026, weight: 120, school: "", text: "VA 5A state champion 2026 at 120", ...o,
})

describe("nameKey", () => {
  it("ignores a middle initial", () => {
    // "Tijuan l Powell" matched nothing by hand; he had a VA 5A 3rd all along.
    expect(nameKey("Tijuan l Powell")).toBe("tijuan powell")
    expect(nameKey("Tijuan Powell")).toBe("tijuan powell")
  })
  it("ignores a suffix", () => {
    expect(nameKey("Kristopher Kerr Jr")).toBe("kristopher kerr")
  })
})

describe("resolveOpponent", () => {
  it("will not turn an unknown wrestler into an out-of-state champion", () => {
    // The Jackson Wells failure. At a Virginia event, his only placing record was in Kentucky
    // and the weights lined up. He was a Benedictine eighth grader with no record at all.
    const rows = [
      cred({ state: "KY", place: 1, weight: 106, school: "Harrison County", text: "KY champion 2024 at 106" }),
      cred({ state: "KY", place: 1, weight: 120, school: "Harrison County", text: "KY champion 2026 at 120" }),
      cred({ state: "VA", place: 5, weight: 165, school: "Broadway HS", text: "VA 5th 2024 at 165" }),
    ]
    const { chosen, reason } = resolveOpponent(rows, "VA", 126, "VA TEAM PREDATOR")
    expect(chosen).toBeNull()
    expect(reason).toContain("shared across")
  })

  it("counts namesakes over every row, not only the placing ones", () => {
    // "Carter Davis" placed once, in Delaware, and looks like one person until the two
    // non-placing rows in other states are counted.
    const rows = [
      cred({ state: "DE", place: 1, weight: 144, school: "SAL", text: "DE champion 2026 at 144" }),
      cred({ state: "CO", place: 99, weight: 215, school: "Hinkley", text: "CO qualifier" }),
      cred({ state: "PA", place: 7, weight: 160, school: "Central York", text: "PA 7th" }),
    ]
    expect(resolveOpponent(rows, "VA", 150, "MAT RATS WRESTLING CLUB").chosen).toBeNull()
  })

  it("prefers the host state when the name spans states", () => {
    // Jack Beaulieu: a Virginia 3rd at 106 and a Hawaii 3rd at 190, at a Virginia event.
    const rows = [
      cred({ state: "VA", place: 3, weight: 106, school: "Chancellor", text: "VA 4A state 3rd 2026 at 106" }),
      cred({ state: "HI", place: 3, weight: 190, school: "Leilehua Boys", text: "HI 3rd 2026 at 190" }),
    ]
    expect(resolveOpponent(rows, "VA", 120, "WILD BUFFALO").chosen?.state).toBe("VA")
  })

  it("lets the club settle it outright", () => {
    const rows = [cred({ state: "SC", place: 4, weight: 138, school: "James Island", text: "SC 4th" })]
    const { chosen, reason } = resolveOpponent(rows, "VA", 144, "JAMES ISLAND WRESTLING CLUB")
    expect(chosen?.state).toBe("SC")
    expect(reason).toContain("club")
  })

  it("says nothing rather than guessing when the wrestler is absent", () => {
    expect(resolveOpponent([], "VA", 126, "VA TEAM PREDATOR").chosen).toBeNull()
    const neverPlaced = [cred({ state: "VA", place: 99, text: "VA qualifier" })]
    expect(resolveOpponent(neverPlaced, "VA", 120, "X").chosen).toBeNull()
  })

  it("rejects a credential far off the bout weight", () => {
    const rows = [cred({ state: "WY", place: 4, weight: 138, school: "", text: "WY 4th at 138" })]
    expect(resolveOpponent(rows, "VA", 190, "SEAHAWKS").chosen).toBeNull()
  })
})

describe("rankWins", () => {
  const win = (o: Partial<TopWin>): TopWin => ({
    wrestler: "x", wrestlerClass: 2027, wrestlerSchool: "", weight: 150, winType: "DEC", score: "", round: "",
    opponent: "y", opponentClub: "", credential: cred({}), tier: 1, sameWeight: true, clubConfirmsSchool: false,
    movedUp: 0, confidence: "probable", ...o,
  })
  it("puts a better placement first", () => {
    const out = rankWins([win({ tier: 3 }), win({ tier: 1 })])
    expect(out[0]!.tier).toBe(1)
  })
  it("ranks the bigger classification above the smaller at equal placement", () => {
    const small = win({ tier: 3, credential: cred({ place: 3, text: "VA 1A state 3rd 2026 at 285" }) })
    const big = win({ tier: 3, credential: cred({ place: 3, text: "VA 6A state 3rd 2026 at 190" }) })
    expect(rankWins([small, big])[0]).toBe(big)
  })
  it("ranks a win at the opponent's own weight above one where he moved up", () => {
    const movedUp = win({ sameWeight: false, movedUp: 18 })
    const same = win({ sameWeight: true, movedUp: 0 })
    expect(rankWins([movedUp, same])[0]).toBe(same)
  })
})
