import { describe, expect, it } from "vitest"
import { runBacktest } from "./backtest"
import { boutsFromOtherTournament, boutsFromStateTournament, buildAliasIndex, buildStateIdentityIndex, isContested, type Bout, type OtherTournamentRow } from "./bouts"
import { eloExpected, eloPeriod } from "./elo"
import { DEFAULT_GLICKO, junesCrossed, newRating, rdAt, updateRating, winProbability, type Rating } from "./glicko2"
import { calibration, ece, fitTemperature, recalibrate, summarize } from "./metrics"

const r = (rating: number, rd: number, extra: Partial<Rating> = {}): Rating => ({
  rating, rd, volatility: 0.06, lastDate: null, bouts: 0, ...extra,
})

describe("glicko2", () => {
  it("reproduces Glickman's worked example", () => {
    const out = updateRating(r(1500, 200), [
      { opponent: r(1400, 30), score: 1 },
      { opponent: r(1550, 100), score: 0 },
      { opponent: r(1700, 300), score: 0 },
    ], "2025-01-01", { ...DEFAULT_GLICKO, tau: 0.5 })
    expect(out.rating).toBeCloseTo(1464.06, 1)
    expect(out.rd).toBeCloseTo(151.52, 1)
    expect(out.volatility).toBeCloseTo(0.05999, 4)
    expect(out.bouts).toBe(3)
    expect(out.lastDate).toBe("2025-01-01")
  })

  it("pulls a barely-known matchup toward 50%", () => {
    const known = winProbability(r(1700, 50), r(1500, 50), "2025-01-01")
    const unknown = winProbability(r(1700, 340), r(1500, 340), "2025-01-01")
    expect(known).toBeGreaterThan(0.7)
    expect(unknown).toBeLessThan(known)
    expect(unknown).toBeGreaterThan(0.5)
    expect(winProbability(r(1500, 350), r(1500, 350), "2025-01-01")).toBe(0.5)
  })

  it("widens RD with time away and across 1 June, capped", () => {
    const p = { ...DEFAULT_GLICKO, rdPerDay: 2, offSeasonRd: 60 }
    const base = r(1600, 60, { lastDate: "2025-03-27" })
    const july = rdAt(base, "2025-07-15", p)
    const may = rdAt(base, "2025-05-27", p)
    expect(may).toBeGreaterThan(60)
    expect(july).toBeGreaterThan(Math.sqrt(60 * 60 + 4 * 110))
    expect(rdAt(base, "2060-01-01", p)).toBe(350)
    expect(junesCrossed("2025-03-27", "2026-07-01")).toBe(2)
    expect(junesCrossed("2025-06-01", "2025-10-01")).toBe(0)
  })

  it("starts everyone at the defaults", () => {
    expect(newRating()).toMatchObject({ rating: 1500, rd: 350, bouts: 0 })
  })
})

describe("elo", () => {
  it("scores an event on pre-event ratings and sums the change", () => {
    const m = new Map<string, number>()
    eloPeriod(m, [{ winner: "a", loser: "b" }, { winner: "a", loser: "c" }])
    expect(m.get("a")).toBe(1532)
    expect(m.get("b")).toBe(1484)
    expect(eloExpected(1600, 1400)).toBeCloseTo(0.76, 2)
  })
})

describe("bouts", () => {
  const row = (o: Partial<OtherTournamentRow>): OtherTournamentRow => ({
    event_key: "super32-2025", year: 2025, weight_class: "132", round: "Round of 64",
    athlete_name: "Al Able", athlete_club: "NC", opponent_name: "Bo Baker", opponent_club: "pa",
    win: true, is_bye: false, win_type: "DEC", event_date: null, gender: null, ...o,
  })
  const aliases = buildAliasIndex([
    { identity_id: "id-al", alias_name_raw: "Al Able", alias_team: "NC", status: "linked" },
    { identity_id: "id-bo", alias_name_raw: "Bo Baker", alias_team: "PA", status: "linked" },
    { identity_id: "id-x", alias_name_raw: "Cy Cole", alias_team: "VA", status: "review" },
  ])

  it("excludes forfeits, byes, defaults and DQs but keeps decisions and overtime", () => {
    for (const t of ["FF", "For", "M FOR", "VFO", "INJ", "VIN", "DEF", "DQ", "BYE"]) expect(isContested(t)).toBe(false)
    for (const t of ["DEC", "Dec", "MD", "TF", "F", "Fall", "VPO1", "VSU", "SV", "TB", null]) expect(isContested(t)).toBe(true)
    expect(isContested("DEC", true)).toBe(false)
  })

  it("collapses a bout stored from both sides into one", () => {
    const { bouts, dropped } = boutsFromOtherTournament([
      row({}),
      row({ athlete_name: "Bo Baker", athlete_club: "PA", opponent_name: "Al Able", opponent_club: "NC", win: false }),
    ], aliases, { includeUnidentified: true })
    expect(bouts).toHaveLength(1)
    expect(bouts[0].winner.key).toBe("id-al")
    expect(bouts[0].loser.key).toBe("id-bo")
    expect(bouts[0].date).toBe("2025-10-19")
    expect(dropped.mirrored).toBe(1)
  })

  it("drops a mirrored pair that disagrees on the winner", () => {
    const { bouts, dropped } = boutsFromOtherTournament([
      row({}),
      row({ athlete_name: "Bo Baker", athlete_club: "PA", opponent_name: "Al Able", opponent_club: "NC", win: true }),
    ], aliases, { includeUnidentified: true })
    expect(bouts).toHaveLength(0)
    expect(dropped.conflicting).toBe(1)
  })

  it("never treats a review alias as a person; unknowns get a read-time key or nothing", () => {
    const rows = [row({ opponent_name: "Cy Cole", opponent_club: "VA" })]
    const loose = boutsFromOtherTournament(rows, aliases, { includeUnidentified: true }).bouts[0]
    expect(loose.loser.identified).toBe(false)
    expect(loose.loser.key).toBe("u:cy cole|va")
    const strict = boutsFromOtherTournament(rows, aliases, { includeUnidentified: false }).bouts[0]
    expect(strict.loser.key).toBe("")
  })

  it("links state placement bouts on (name, state, gender) only when one person answers", () => {
    const idx = buildStateIdentityIndex([
      { id: "p1", normalized_name: "dan dee", state: "OH", gender: "Male" },
      { id: "p2", normalized_name: "ed eck", state: "OH", gender: "Male" },
      { id: "p3", normalized_name: "ed eck", state: "OH", gender: "Male" },
    ])
    const { bouts } = boutsFromStateTournament([
      { season: 2026, state: "OH", gender: "Boys", classification: "D1", weight: "144", bout: "1st", winner_name: "Dan Dee", winner_school: "A", loser_name: "Ed Eck", loser_school: "B", result_type: null },
      { season: 2026, state: "VA", gender: "Boys", classification: "6A", weight: "144", bout: "1st", winner_name: "Dan Dee", winner_school: "A", loser_name: "Ed Eck", loser_school: "B", result_type: "DEC" },
    ], idx, { includeUnidentified: true, skipStates: new Set(["VA|2026"]) })
    expect(bouts).toHaveLength(1)
    expect(bouts[0].winner.key).toBe("p1")
    expect(bouts[0].loser.identified).toBe(false)
  })
})

describe("backtest", () => {
  const b = (eventKey: string, date: string, w: string, l: string): Bout => ({
    eventKey, eventFamily: "x", date, weight: "132", round: null, method: "DEC", gender: "M",
    winner: { key: w, identified: true, name: w, state: "NC" },
    loser: { key: l, identified: true, name: l, state: "NC" },
  })

  it("predicts an event only from earlier events, never from its own rounds", () => {
    const bouts = [
      b("e1", "2025-01-01", "a", "b"),
      b("e1", "2025-01-01", "a", "c"),
      b("e2", "2025-03-01", "a", "b"),
      b("e2", "2025-03-01", "a", "c"),
    ]
    const { scored } = runBacktest(bouts, { predictIf: () => true })
    expect(scored.slice(0, 2).every((s) => s.glicko === 0.5 && s.elo === 0.5)).toBe(true)
    expect(scored.slice(2).every((s) => s.glicko > 0.5 && s.priorWinner === 2)).toBe(true)
  })

  it("freezes ratings when told not to update", () => {
    const bouts = [b("e1", "2025-01-01", "a", "b"), b("e2", "2025-11-01", "a", "b"), b("e3", "2026-02-01", "a", "b")]
    const { scored } = runBacktest(bouts, { updateIf: (d) => d < "2025-10-01", predictIf: (x) => x.date >= "2025-10-01" })
    expect(scored).toHaveLength(2)
    expect(scored[0].priorWinner).toBe(1)
    expect(scored[1].priorWinner).toBe(1)
    expect(scored[1].glicko).toBeLessThan(scored[0].glicko)
  })
})

describe("metrics", () => {
  it("scores accuracy, log loss and Brier, counting 50/50 as half", () => {
    const s = summarize([{ p: 0.8 }, { p: 0.4 }, { p: 0.5 }])
    expect(s.accuracy).toBeCloseTo(0.5)
    expect(s.brier).toBeCloseTo((0.04 + 0.36 + 0.25) / 3)
    expect(s.logLoss).toBeCloseTo((-Math.log(0.8) - Math.log(0.4) - Math.log(0.5)) / 3)
  })

  it("buckets by the favourite's probability", () => {
    const rows = calibration([{ p: 0.75 }, { p: 0.25 }, { p: 0.72 }, { p: 0.95 }])
    const seventy = rows.find((r) => r.lo === 0.7)!
    expect(seventy.n).toBe(3)
    expect(seventy.observed).toBeCloseTo(2 / 3)
    expect(rows.find((r) => r.lo === 0.9)!.n).toBe(1)
    expect(ece(rows)).toBeGreaterThan(0)
  })
})

describe("state championship sides", () => {
  it("resolve on (name, the association's state, gender) and fall back to a (name, state) key", () => {
    const idx = buildStateIdentityIndex([{ id: "nc-1", normalized_name: "al able", state: "NC", gender: "Male" }])
    const { bouts } = boutsFromOtherTournament([{
      event_key: "nchsaa-states-2026", year: 2026, weight_class: "132", round: "Finals",
      athlete_name: "Al Able", athlete_club: "Union Pines High School", opponent_name: "Bo Baker", opponent_club: "Laney",
      win: true, is_bye: false, win_type: "DEC", event_date: "2026-02-19", gender: "M",
    }], new Map(), { includeUnidentified: true }, idx)
    expect(bouts[0].winner).toMatchObject({ key: "nc-1", identified: true, state: "NC" })
    expect(bouts[0].loser).toMatchObject({ key: "u:bo baker|nc", identified: false, state: "NC" })
  })

  it("does not read a state into an open event's club", () => {
    const idx = buildStateIdentityIndex([{ id: "nc-1", normalized_name: "al able", state: "NC", gender: "Male" }])
    const { bouts } = boutsFromOtherTournament([{
      event_key: "journeymen-fall-classic-2026", year: 2026, weight_class: "132", round: "Finals",
      athlete_name: "Al Able", athlete_club: "Iron Faith", opponent_name: "Bo Baker", opponent_club: "Blair Academy",
      win: true, is_bye: false, win_type: "DEC", event_date: "2026-10-04", gender: "M",
    }], new Map(), { includeUnidentified: true }, idx)
    expect(bouts[0].winner).toMatchObject({ key: "u:al able|iron faith", identified: false, state: null })
  })
})

describe("debut offsets", () => {
  it("start a state-tournament newcomer below a national entrant", () => {
    const mk = (eventKey: string, date: string, w: string, l: string): Bout => ({
      eventKey, eventFamily: "", date, weight: "132", round: null, method: "DEC", gender: "M",
      winner: { key: w, identified: true, name: w, state: "NC" }, loser: { key: l, identified: true, name: l, state: "NC" },
    })
    const bouts = [mk("nhsca-nationals-2025", "2025-03-27", "x", "natloser"), mk("nchsaa-states-2026", "2026-02-19", "natloser", "newkid")]
    const plain = runBacktest(bouts, { predictIf: (b) => b.eventKey.startsWith("nchsaa") }).scored[0]
    const tiered = runBacktest(bouts, { predictIf: (b) => b.eventKey.startsWith("nchsaa"), debutOffset: { state: -300 } }).scored[0]
    expect(plain.glicko).toBeLessThan(0.5)
    expect(tiered.glicko).toBeGreaterThan(0.5)
    expect(tiered.elo).toBeGreaterThan(0.5)
  })
})

describe("recalibration", () => {
  it("sharpens an underconfident model and leaves 50% alone", () => {
    expect(recalibrate(0.5, 2)).toBe(0.5)
    expect(recalibrate(0.7, 1)).toBeCloseTo(0.7)
    expect(recalibrate(0.7, 1.5)).toBeGreaterThan(0.7)
    // Said 60%, won 80%: the fit should sharpen.
    const preds = [...Array(80).fill({ p: 0.6 }), ...Array(20).fill({ p: 0.4 })]
    expect(fitTemperature(preds)).toBeGreaterThan(2)
  })
})
