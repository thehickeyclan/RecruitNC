#!/usr/bin/env npx tsx
/**
 * Matchup Intelligence backtest: bout coverage audit, Glicko-2 vs Elo vs national rank.
 * READ ONLY — writes nothing to the database and publishes nothing. Output is markdown on stdout
 * plus a JSON file of every table, for docs/matchup-backtest-2026.md.
 *
 *   npx tsx scripts/matchup/backtest-2026.ts --out /path/results.json
 *   npx tsx scripts/matchup/backtest-2026.ts --cache <dir>   # read <table>.json dumps instead of Supabase
 */
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"
import { runBacktest, type ScoredBout } from "@/lib/matchup/backtest"
import {
  boutsFromOtherTournament, boutsFromStateTournament, buildAliasIndex, buildStateIdentityIndex, normName,
  type Bout, type BuildOptions, type IdentityRow, type OtherTournamentRow, type StateTournamentRow,
} from "@/lib/matchup/bouts"
import { DEFAULT_ELO, type EloParams } from "@/lib/matchup/elo"
import { DEFAULT_GLICKO, type GlickoParams } from "@/lib/matchup/glicko2"
import { calibration, ece, fitTemperature, recalibrate, summarize } from "@/lib/matchup/metrics"

for (const f of [".env.local", ".env"]) {
  const p = path.join(process.cwd(), f)
  if (!fs.existsSync(p)) continue
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
}
const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : undefined }
const CACHE = arg("cache")
const OUT = arg("out")

async function load<T>(table: string, select: string): Promise<T[]> {
  if (CACHE) return JSON.parse(fs.readFileSync(path.join(CACHE, `${table}.json`), "utf8"))
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select(select).order("id").range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...((data ?? []) as T[]))
    if (!data || data.length < 1000) break
  }
  return out
}

const CUTOFF = "2025-10-01"
const VALID_FROM = "2024-10-01"
const STATIC_EVENTS = new Set(["super32-2025", "nchsaa-states-2026"])

/** State events whose brackets name a school, not a state: the state is the event's. */
function eventState(eventKey: string): string | null {
  const k = eventKey.toLowerCase()
  if (/^(nchsaa|toc|nc-usaw|tarheel|ucd|aau-scholastic-duals-2026-nc|nhsca-duals-2026-nc)/.test(k)) return "NC"
  if (/^(vhsl|visaa)/.test(k)) return "VA"
  if (/^(schsl|scisa|sc-usaw)/.test(k)) return "SC"
  if (/^(mpssaa|miaa|mis)-/.test(k)) return "MD"
  const m = k.match(/^state:([a-z]{2})-/)
  return m ? m[1].toUpperCase() : null
}
const NATIONAL = new Set(["Super 32", "NHSCA Nationals", "Fargo", "Journeymen Fall Classic", "Journeymen Women's", "USAW Women's Nationals", "Early Entry"])
const STATE_LEVEL = new Set(["NCHSAA States", "VA/SC/MD state brackets", "State placement bouts"])

const pct = (x: number) => (Number.isFinite(x) ? `${(100 * x).toFixed(1)}%` : "—")
const f3 = (x: number) => (Number.isFinite(x) ? x.toFixed(3) : "—")

function table(head: string[], rows: Array<Array<string | number>>): string {
  return [`| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`, ...rows.map((r) => `| ${r.join(" | ")} |`)].join("\n")
}

async function main() {
  const otb = await load<OtherTournamentRow & { id: string }>("other_tournament_bouts",
    "id,event_key,event_name,year,weight_class,round,athlete_name,athlete_club,opponent_name,opponent_club,win,is_bye,win_type,event_date,gender")
  const stb = await load<StateTournamentRow & { id: string }>("state_tournament_bouts",
    "id,season,state,gender,classification,weight,bout,winner_name,winner_school,loser_name,loser_school,result_type")
  const aliasRows = await load<{ identity_id: string; alias_name_raw: string; alias_team: string; status: string; source: string }>(
    "identity_aliases", "id,identity_id,source,alias_name_raw,alias_team,status")
  const identities = await load<IdentityRow & { graduation_year: number | null }>("athlete_identities", "id,normalized_name,state,gender,graduation_year")
  const rankings = await load<{ athlete_name: string; state: string | null; gender: string | null; rank: number; scope: string; ranking_month: string; source: string; high_school: string | null }>(
    "national_rankings", "id,athlete_name,state,gender,rank,scope,ranking_month,source,high_school")

  const aliases = buildAliasIndex(aliasRows.filter((a) => a.source === "other_tournament_bouts"))
  const stateIdx = buildStateIdentityIndex(identities)
  const skipStates = new Set<string>()
  for (const r of otb) {
    const s = eventState(r.event_key)
    if (s && /-states-/.test(r.event_key) && s !== "NC") skipStates.add(`${s}|${r.year}`)
  }

  const build = (opts: BuildOptions) => {
    const a = boutsFromOtherTournament(otb, aliases, opts, stateIdx)
    const b = boutsFromStateTournament(stb, stateIdx, { ...opts, skipStates })
    const bouts = [...a.bouts, ...b.bouts]
    for (const x of bouts) {
      const s = eventState(x.eventKey)
      if (s) { x.winner.state ??= s; x.loser.state ??= s }
    }
    return { bouts, dropped: { otb: a.dropped, state: b.dropped } }
  }
  const all = build({ includeUnidentified: true })
  const strict = build({ includeUnidentified: false })
  const md: string[] = []
  const json: Record<string, unknown> = {}

  // ── 1. Coverage ──────────────────────────────────────────────────────────────────────────
  md.push(`## Coverage\n\nRaw rows: ${otb.length} other_tournament_bouts, ${stb.length} state_tournament_bouts. Contested bouts after mirror-dedupe and exclusions: ${all.bouts.length}.`)
  md.push("Dropped: " + JSON.stringify(all.dropped))
  const covBy = (keyOf: (b: Bout) => string) => {
    const m = new Map<string, { n: number; both: number; one: number }>()
    for (const b of all.bouts) {
      const k = keyOf(b)
      if (!m.has(k)) m.set(k, { n: 0, both: 0, one: 0 })
      const e = m.get(k)!
      e.n++
      const c = Number(b.winner.identified) + Number(b.loser.identified)
      if (c === 2) e.both++
      else if (c === 1) e.one++
    }
    return [...m.entries()].sort((a, b) => b[1].n - a[1].n)
  }
  const famYear = covBy((b) => `${b.eventFamily} ${b.date.slice(0, 4)}`)
  md.push("### Both wrestlers identified, by event\n\n" + table(["Event", "Bouts", "Both identified", "One", "Neither"],
    famYear.map(([k, e]) => [k, e.n, pct(e.both / e.n), pct(e.one / e.n), pct((e.n - e.both - e.one) / e.n)])))
  json.coverageByEvent = famYear

  // Sides by state: national events only, which is where a state code is on every row.
  const sideState = new Map<string, { sides: number; ident: number; stateSides: number; stateIdent: number }>()
  for (const b of all.bouts) {
    for (const s of [b.winner, b.loser]) {
      if (!s.state) continue
      if (!sideState.has(s.state)) sideState.set(s.state, { sides: 0, ident: 0, stateSides: 0, stateIdent: 0 })
      const e = sideState.get(s.state)!
      if (NATIONAL.has(b.eventFamily)) { e.sides++; if (s.identified) e.ident++ }
      if (STATE_LEVEL.has(b.eventFamily)) { e.stateSides++; if (s.identified) e.stateIdent++ }
    }
  }

  // How states connect: of each state's identified state-tournament wrestlers, how many also
  // wrestled a national event — the only path by which their rating meets another state's.
  const nationalPeople = new Set<string>()
  const statePeople = new Map<string, Set<string>>()
  const cross = new Map<string, number>()
  for (const b of all.bouts) {
    const isNat = NATIONAL.has(b.eventFamily)
    for (const s of [b.winner, b.loser]) {
      if (isNat) nationalPeople.add(s.key)
      if (STATE_LEVEL.has(b.eventFamily) && s.state) {
        if (!statePeople.has(s.state)) statePeople.set(s.state, new Set())
        statePeople.get(s.state)!.add(s.key)
      }
    }
    if (isNat && b.winner.state && b.loser.state && b.winner.state !== b.loser.state) {
      for (const st of [b.winner.state, b.loser.state]) cross.set(st, (cross.get(st) ?? 0) + 1)
    }
  }
  const stRows = [...sideState.entries()].filter(([s]) => /^[A-Z]{2}$/.test(s)).sort((a, b) => b[1].sides - a[1].sides).map(([s, e]) => {
    const people = statePeople.get(s)
    const bridged = people ? [...people].filter((k) => nationalPeople.has(k)).length : 0
    return [s, e.sides, pct(e.ident / e.sides), e.stateSides, e.stateSides ? pct(e.stateIdent / e.stateSides) : "—",
      people?.size ?? 0, people?.size ? pct(bridged / people.size) : "—", cross.get(s) ?? 0] as Array<string | number>
  })
  md.push("### By state\n\nNational sides = a wrestler from that state in a national-event bout. Bridged = that state's state-tournament wrestlers who also have a national bout (the only link between states).\n\n" +
    table(["State", "National sides", "Identified", "State-tourney sides", "Identified", "State-tourney wrestlers", "Bridged nationally", "Cross-state national bouts"], stRows))
  json.coverageByState = stRows

  // ── 2. Tune on the season before the test (no test data touched) ────────────────────────
  const validPredict = (b: Bout) => b.date >= VALID_FROM && b.date < CUTOFF
  const bounded = all.bouts.filter((b) => b.date < CUTOFF)
  // Debut offsets first (state-tournament and open-event newcomers start below a national entrant).
  const baseGp = { ...DEFAULT_GLICKO, initialRd: 275, rdPerDay: 6, offSeasonRd: 0 }
  const offGrid: Array<{ off: { state: number; open: number }; ll: number }> = []
  for (const stateOff of [0, -100, -200, -300, -400]) for (const openOff of [0, -100, -200]) {
    const off = { state: stateOff, open: openOff }
    const s = summarize(runBacktest(bounded, { glicko: baseGp, debutOffset: off, predictIf: validPredict }).scored.map((x) => ({ p: x.glicko })))
    offGrid.push({ off, ll: s.logLoss })
  }
  offGrid.sort((a, b) => a.ll - b.ll)
  const OFF = offGrid[0].off
  const grid: Array<{ gp: GlickoParams; ll: number; acc: number }> = []
  for (const tau of [0.3, 0.8]) for (const rdPerDay of [0, 3, 6, 10]) for (const offSeasonRd of [0, 60, 120]) for (const initialRd of [200, 275, 350]) {
    const gp = { ...DEFAULT_GLICKO, tau, rdPerDay, offSeasonRd, initialRd }
    const s = summarize(runBacktest(bounded, { glicko: gp, debutOffset: OFF, predictIf: validPredict }).scored.map((x) => ({ p: x.glicko })))
    grid.push({ gp, ll: s.logLoss, acc: s.accuracy })
  }
  grid.sort((a, b) => a.ll - b.ll)
  const GP = grid[0].gp
  const eloGrid: Array<{ ep: EloParams; ll: number }> = []
  for (const k of [16, 32, 48, 64, 96, 128]) {
    const ep = { ...DEFAULT_ELO, k }
    eloGrid.push({ ep, ll: summarize(runBacktest(bounded, { elo: ep, debutOffset: OFF, predictIf: validPredict }).scored.map((x) => ({ p: x.elo }))).logLoss })
  }
  eloGrid.sort((a, b) => a.ll - b.ll)
  const EP = eloGrid[0].ep
  const validScored = runBacktest(bounded, { glicko: GP, elo: EP, debutOffset: OFF, predictIf: validPredict }).scored
  const TG = fitTemperature(validScored.map((x) => ({ p: x.glicko })))
  const TE = fitTemperature(validScored.map((x) => ({ p: x.elo })))
  type Cal = ScoredBout & { glickoRaw: number; eloRaw: number }
  /* Every table below reads the recalibrated numbers; the raw ones are kept for the headline rows. */
  const R = (xs: ScoredBout[]): Cal[] => xs.map((x) => ({ ...x, glickoRaw: x.glicko, eloRaw: x.elo, glicko: recalibrate(x.glicko, TG), elo: recalibrate(x.elo, TE) }))
  const noOff = summarize(runBacktest(bounded, { glicko: GP, predictIf: validPredict }).scored.map((x) => ({ p: x.glicko })))
  md.push(`## Tuning (validation ${VALID_FROM} to ${CUTOFF}, never the test events)\n\nDebut offsets chosen: state ${OFF.state}, open ${OFF.open} (validation log loss without them ${f3(noOff.logLoss)}).\nGlicko-2 chosen: τ=${GP.tau}, initial RD ${GP.initialRd}, RD growth ${GP.rdPerDay}/√day, off-season +${GP.offSeasonRd} — validation log loss ${f3(grid[0].ll)}, accuracy ${pct(grid[0].acc)}. Worst grid point ${f3(grid[grid.length - 1].ll)}.\nElo chosen: K=${EP.k}, validation log loss ${f3(eloGrid[0].ll)}.\nRecalibration exponent (validation): Glicko-2 ${TG.toFixed(2)}, Elo ${TE.toFixed(2)}. Tables below use the recalibrated probabilities unless a row says raw.`)
  json.tuning = { offsets: offGrid, glicko: grid.slice(0, 10), elo: eloGrid }

  // ── 3. Tests ────────────────────────────────────────────────────────────────────────────
  const report = (title: string, scored: Cal[], denom?: number) => {
    const g = summarize(scored.map((s) => ({ p: s.glicko })))
    const e = summarize(scored.map((s) => ({ p: s.elo })))
    const gr = summarize(scored.map((s) => ({ p: s.glickoRaw })))
    const er = summarize(scored.map((s) => ({ p: s.eloRaw })))
    const crg = ece(calibration(scored.map((s) => ({ p: s.glickoRaw }))))
    const cre = ece(calibration(scored.map((s) => ({ p: s.eloRaw }))))
    const cg = calibration(scored.map((s) => ({ p: s.glicko })))
    const ce = calibration(scored.map((s) => ({ p: s.elo })))
    const out = [`### ${title}\n`, denom ? `${g.n} of ${denom} bouts (${pct(g.n / denom)}).\n` : "", table(["Model", "Bouts", "Accuracy", "Log loss", "Brier", "Calibration error"], [
      ["Glicko-2 (recalibrated)", g.n, pct(g.accuracy), f3(g.logLoss), f3(g.brier), pct(ece(cg))],
      ["Glicko-2 raw", gr.n, pct(gr.accuracy), f3(gr.logLoss), f3(gr.brier), pct(crg)],
      ["Elo (recalibrated)", e.n, pct(e.accuracy), f3(e.logLoss), f3(e.brier), pct(ece(ce))],
      ["Elo raw", er.n, pct(er.accuracy), f3(er.logLoss), f3(er.brier), pct(cre)],
      ["Coin flip", g.n, "50.0%", f3(Math.log(2)), "0.250", "—"],
    ])]
    out.push("\nCalibration (Glicko-2 favourite's probability):\n\n" + table(["Said", "Bouts", "Mean said", "Favourite won", "Elo: bouts", "Elo: mean said", "Elo: won"],
      cg.map((r, i) => [`${Math.round(r.lo * 100)}-${Math.round(r.hi * 100)}%`, r.n, pct(r.predicted), pct(r.observed), ce[i].n, pct(ce[i].predicted), pct(ce[i].observed)])))
    return { md: out.join("\n"), g, e, cg, ce }
  }
  const breakdown = (title: string, scored: Cal[], keysOf: (s: ScoredBout) => string[], order?: string[]) => {
    const m = new Map<string, Cal[]>()
    for (const s of scored) for (const k of keysOf(s)) { if (!m.has(k)) m.set(k, []); m.get(k)!.push(s) }
    let entries = [...m.entries()]
    entries = order ? order.filter((k) => m.has(k)).map((k) => [k, m.get(k)!] as [string, Cal[]]) : entries.sort((a, b) => b[1].length - a[1].length)
    const rows = entries.map(([k, v]) => {
      const g = summarize(v.map((s) => ({ p: s.glicko })))
      const e = summarize(v.map((s) => ({ p: s.elo })))
      return [k, v.length, pct(g.accuracy), f3(g.logLoss), f3(g.brier), pct(ece(calibration(v.map((s) => ({ p: s.glicko }))))), pct(e.accuracy), f3(e.logLoss)]
    })
    return `#### ${title}\n\n` + table(["", "Bouts", "Glicko acc", "Glicko log loss", "Glicko Brier", "Glicko cal. err", "Elo acc", "Elo log loss"], rows)
  }
  const priorBucket = (n: number) => (n === 0 ? "0" : n < 5 ? "1-4" : n < 10 ? "5-9" : n < 20 ? "10-19" : "20+")
  const PRIOR_ORDER = ["0", "1-4", "5-9", "10-19", "20+"]
  const weightGroup = (w: string) => {
    const n = parseInt(w, 10)
    if (!Number.isFinite(n)) return "unparsed"
    return n <= 113 ? "≤113" : n <= 132 ? "114-132" : n <= 150 ? "133-150" : n <= 175 ? "151-175" : n <= 215 ? "176-215" : "216+"
  }
  const WEIGHT_ORDER = ["≤113", "114-132", "133-150", "151-175", "176-215", "216+", "unparsed"]
  const rdBucket = (s: ScoredBout) => { const r = Math.max(s.rdWinner, s.rdLoser); return r < 100 ? "<100" : r < 150 ? "100-149" : r < 200 ? "150-199" : r < 250 ? "200-249" : "250+" }
  const eventSize = new Map<string, number>()
  for (const b of all.bouts) eventSize.set(b.eventKey, (eventSize.get(b.eventKey) ?? 0) + 1)
  const styleOf = (k: string) => /-(fs|freestyle)$|-fs-|women-s-freestyle|womens-world-classic.*fs/.test(k) ? "freestyle" : /-gr$|-gr-/.test(k) ? "Greco-Roman" : "folkstyle"
  const breakdowns = (scored: Cal[]) => [
    breakdown("By event (events under 150 bouts pooled by family)", scored, (s) => {
      const k = s.bout.eventKey.startsWith("state:") ? `state placement bouts ${s.bout.date.slice(0, 4)}` : s.bout.eventKey
      return [(eventSize.get(s.bout.eventKey) ?? 0) >= 150 || s.bout.eventKey.startsWith("state:") ? k : `${s.bout.eventFamily} (smaller events)`]
    }),
    breakdown("By style", scored, (s) => [styleOf(s.bout.eventKey)]),
    breakdown("By prior bouts on file (the less-known of the two)", scored, (s) => [priorBucket(Math.min(s.priorWinner, s.priorLoser))], PRIOR_ORDER),
    breakdown("By larger rating deviation of the two", scored, (s) => [rdBucket(s)], ["<100", "100-149", "150-199", "200-249", "250+"]),
    breakdown("By weight", scored, (s) => [weightGroup(s.bout.weight)], WEIGHT_ORDER),
    breakdown("By gender", scored, (s) => [s.bout.gender ?? "not stated"]),
    breakdown("By state (bouts with a wrestler from it; top 15)", scored, (s) => [...new Set([s.bout.winner.state ?? "?", s.bout.loser.state ?? "?"])]).split("\n").slice(0, 19).join("\n"),
    breakdown("In-state vs cross-state", scored, (s) => [!s.bout.winner.state || !s.bout.loser.state ? "state unknown" : s.bout.winner.state === s.bout.loser.state ? "same state" : "cross-state"]),
    breakdown("Both wrestlers identified in the registry?", scored, (s) => [s.bout.winner.identified && s.bout.loser.identified ? "both" : s.bout.winner.identified || s.bout.loser.identified ? "one" : "neither"]),
  ].join("\n\n")

  const staticRun0 = runBacktest(all.bouts, { glicko: GP, elo: EP, debutOffset: OFF, updateIf: (d) => d < CUTOFF, predictIf: (b) => STATIC_EVENTS.has(b.eventKey) })
  const staticRun = { scored: R(staticRun0.scored) }
  const st = report(`Static test: rated on everything before ${CUTOFF}, predicting Super 32 2025 and NCHSAA States 2026`, staticRun.scored)
  md.push("## Static test\n\n" + st.md + "\n\n" + breakdowns(staticRun.scored))
  for (const ev of STATIC_EVENTS) {
    const sub = staticRun.scored.filter((s) => s.bout.eventKey === ev)
    md.push(report(ev, sub).md)
  }
  const both1 = staticRun.scored.filter((s) => s.priorWinner > 0 && s.priorLoser > 0)
  md.push(report("Static test, only bouts where both wrestlers had a prior bout", both1).md)

  const strictStatic = { scored: R(runBacktest(strict.bouts, { glicko: GP, elo: EP, debutOffset: OFF, updateIf: (d) => d < CUTOFF, predictIf: (b) => STATIC_EVENTS.has(b.eventKey) }).scored) }
  md.push(report("Static test, registry identities only (unidentified wrestlers dropped from rating and test)", strictStatic.scored).md)

  const rolling = { scored: R(runBacktest(all.bouts, { glicko: GP, elo: EP, debutOffset: OFF, predictIf: (b) => b.date >= CUTOFF }).scored) }
  const rl = report(`Roll-forward: every event from ${CUTOFF} on, each predicted from all events before it`, rolling.scored)
  md.push("## Roll-forward\n\n" + rl.md + "\n\n" + breakdowns(rolling.scored))
  const N = rolling.scored.length
  md.push(report("Roll-forward, both wrestlers RD < 250 (the gate a coach-facing number would need)", rolling.scored.filter((s) => Math.max(s.rdWinner, s.rdLoser) < 250), N).md)
  md.push(report("Roll-forward, both wrestlers RD < 150", rolling.scored.filter((s) => Math.max(s.rdWinner, s.rdLoser) < 150), N).md)
  md.push(report("Roll-forward, both wrestlers 5+ prior bouts", rolling.scored.filter((s) => Math.min(s.priorWinner, s.priorLoser) >= 5), N).md)
  md.push(report("Roll-forward, NC wrestler involved, both RD < 250", rolling.scored.filter((s) => (s.bout.winner.state === "NC" || s.bout.loser.state === "NC") && Math.max(s.rdWinner, s.rdLoser) < 250), rolling.scored.filter((s) => s.bout.winner.state === "NC" || s.bout.loser.state === "NC").length).md)

  // Head-to-head: the Compare tool's rule is the latest meeting within 12 months.
  const lastMeet = new Map<string, { winner: string; date: string }>()
  const h2h: Array<{ s: Cal; prevWinnerWon: boolean }> = []
  const rollKeys = new Set(rolling.scored.map((s) => s.bout))
  const scoredByBout = new Map(rolling.scored.map((s) => [s.bout, s]))
  for (const b of [...all.bouts].sort((a, b) => a.date.localeCompare(b.date))) {
    if (!b.winner.key || !b.loser.key) continue
    const pk = [b.winner.key, b.loser.key].sort().join("~")
    const prev = lastMeet.get(pk)
    if (rollKeys.has(b) && prev && prev.date < b.date && Date.parse(b.date) - Date.parse(prev.date) <= 366 * 86_400_000) {
      h2h.push({ s: scoredByBout.get(b)!, prevWinnerWon: prev.winner === b.winner.key })
    }
    if (!prev || prev.date <= b.date) lastMeet.set(pk, { winner: b.winner.key, date: b.date })
  }
  const h2hAgree = h2h.filter((x) => (x.s.glicko > 0.5) === (x.prevWinnerWon)).length
  md.push(`### Rematches within 12 months (roll-forward)\n\n${h2h.length} test bouts were rematches of a meeting in the previous 12 months at an earlier event. The previous winner won again ${pct(h2h.filter((x) => x.prevWinnerWon).length / h2h.length)}; Glicko-2 accuracy on them ${pct(summarize(h2h.map((x) => ({ p: x.s.glicko }))).accuracy)}; Glicko-2 picked the previous winner ${pct(h2hAgree / h2h.length)} of the time.`)

  // ── 4. National rank baseline ───────────────────────────────────────────────────────────
  // Only 2026-09 and 2026-10 rankings exist. Weight rankings, ranks 1-30 only (31+ is not a rank).
  const rankOf = (month: string) => {
    const m = new Map<string, number>()
    for (const r of rankings) {
      if (r.ranking_month !== month || r.scope !== "weight" || !(r.rank >= 1 && r.rank <= 30) || !r.state) continue
      const g = r.gender === "F" ? "Female" : "Male"
      const n = normName(r.athlete_name)
      /* A club-singlet event (Journeymen) keys an unlinked wrestler on his club, which is often his school. */
      const school = String(r.high_school ?? "").trim().toLowerCase()
      const keys = [stateIdx.get(`${n}|${r.state}|${g}`), `u:${n}|${r.state.toLowerCase()}`, school ? `u:${n}|${school}` : null].filter(Boolean) as string[]
      for (const k of keys) m.set(k, Math.min(m.get(k) ?? 99, r.rank))
    }
    return m
  }
  const rankBaseline = (title: string, scored: Cal[], ranks: Map<string, number>) => {
    const sub: Array<{ s: Cal; p: number }> = []
    for (const s of scored) {
      const rw = ranks.get(s.bout.winner.key)
      const rlR = ranks.get(s.bout.loser.key)
      if (rw == null && rlR == null) continue
      const p = rw != null && rlR != null ? (rw < rlR ? 1 : rw > rlR ? 0 : 0.5) : rw != null ? 1 : 0
      sub.push({ s, p })
    }
    const acc = summarize(sub.map((x) => ({ p: x.p }))).accuracy
    const g = summarize(sub.map((x) => ({ p: x.s.glicko })))
    const e = summarize(sub.map((x) => ({ p: x.s.elo })))
    const bothRanked = sub.filter((x) => ranks.has(x.s.bout.winner.key) && ranks.has(x.s.bout.loser.key))
    return `### ${title}\n\n` + table(["", "Bouts with a ranked wrestler", "Higher rank wins: acc", "Glicko-2 acc", "Glicko-2 log loss", "Elo acc", "Elo log loss"],
      [["All", sub.length, pct(acc), pct(g.accuracy), f3(g.logLoss), pct(e.accuracy), f3(e.logLoss)],
       ["Both ranked", bothRanked.length, pct(summarize(bothRanked.map((x) => ({ p: x.p }))).accuracy), pct(summarize(bothRanked.map((x) => ({ p: x.s.glicko }))).accuracy), "", pct(summarize(bothRanked.map((x) => ({ p: x.s.elo }))).accuracy), ""]])
  }
  const sept = rankOf("2026-09-01")
  md.push("## National rank baseline\n\n" + rankBaseline("Leak-free: Sept 2026 rankings vs Journeymen Fall Classic 2026 (roll-forward predictions)",
    rolling.scored.filter((s) => s.bout.eventKey.startsWith("journeymen-fall-classic-2026")), sept))
  md.push(rankBaseline("Hindsight (favours the rank baseline): Sept 2026 rankings vs the static test events",
    staticRun.scored, sept))

  const text = md.join("\n\n")
  console.log(text)
  if (OUT) {
    fs.writeFileSync(OUT, JSON.stringify({ ...json, static: { g: st.g, e: st.e, cg: st.cg, ce: st.ce }, rolling: { g: rl.g, e: rl.e, cg: rl.cg }, temps: { TG, TE }, markdown: text }, null, 1))
  }
}
main().catch((e) => { console.error("FAILED:", e); process.exit(1) })
