/**
 * Super 32 Command Center engine: everything computed from a Flo export, with no database.
 *
 * The export is the whole event in one file: boys' and girls' high school brackets, middle
 * school and youth, with no division column, and weight labels shared between them (2025 had two
 * brackets each at 100, 106, 112, 120, 132 and 138). Within a weight, everyone linked by a chain of
 * bouts is one bracket. The seed list names who belongs to which division, so the bracket that
 * holds a division's seeds at that weight is that division's bracket. Without seeds the boys'
 * bracket is the largest at a boys' weight, and a girls' weight with no seeds is left out rather
 * than guessed (it surfaces in `unresolved`).
 *
 * Tiers (Matt, 23 Oct 2026, replacing the 22 Oct draft):
 * - HUGE: a win over a #1-12 seed.
 * - BIG: a win over any other seed (#13-32).
 * Seeds alone decide. An unseeded opponent's rankings and titles are still listed beside the
 * match as context, but they never tier the win.
 * - A forfeit, medical forfeit, default or DQ is never tiered. Ranks past 30 are not ranks.
 * - Upset is a tag, never a tier: an unseeded wrestler beats a seed, or a seed beats one at
 *   least 4 places higher.
 */
import { namesLikelySamePerson } from "@/lib/athlete-name-match"
import { parseSuper32Csv, type Super32Row } from "@/lib/super32-bout-import"

export type Gender = "boys" | "girls"

export const BOYS_WEIGHTS = ["106", "113", "120", "126", "132", "138", "144", "150", "157", "165", "175", "190", "215", "285"]
/** Girls' weights seen at Super 32 in 2025 and on the 2026 seed board. */
export const GIRLS_WEIGHTS = ["95", "100", "106", "112", "118", "124", "132", "138", "148", "160", "175", "200"]

/**
 * One wrestler from the official field. `seed` is null for an unseeded entrant: the bracket PDFs
 * list the whole field, so every NC wrestler is on the page before the first match, and the
 * names also tell the division split which bracket is which.
 */
export type SeedRow = { gender: Gender; weight: string; seed: number | null; name: string; state: string }

/** An opponent's credential that can tier a win. Built by the loader from tables we hold. */
export type Credential = {
  name: string
  state: string | null
  gender: Gender | null
  kind: "national_rank" | "board_rank" | "event_champion" | "event_all_american" | "state_champion" | "state_placer"
  /** National rank (weight lists), board position (Big Board / P4P) or state place. */
  rank?: number
  /** Shown in copy: "#4 nationally (SI)", "2025 Fargo champion". */
  label: string
}

export type LiveBout = Super32Row & {
  gender: Gender
  /** Stable across re-uploads: weight, round and both wrestlers. */
  key: string
}

export type Tier = "huge" | "big" | "win"

export type TieredWin = {
  bout: LiveBout
  tier: Tier
  upset: boolean
  /** The credential that earned the tier, strongest first; empty for a plain win. */
  reasons: string[]
  opponentSeed: number | null
  winnerSeed: number | null
}

export type EntrantStatus = "not_started" | "alive" | "alive_consis" | "eliminated" | "placed"

export type EntrantSummary = {
  name: string
  team: string
  gender: Gender
  weight: string
  seed: number | null
  wins: number
  losses: number
  status: EntrantStatus
  placement: number | null
  aaClinched: boolean
  finalist: boolean
  /** Consecutive wins at the end of the bout list. */
  streak: number
  hotStreak: boolean
  onFire: boolean
  consiRun: boolean
  bouts: Array<{ bout: LiveBout; win: boolean; opponent: string; opponentTeam: string; tiered: TieredWin | null; opponentReasons?: string[]; lossToSeed?: number | null }>
}

// ---------------------------------------------------------------------------------------------
// Parsing and divisions

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z' -]/g, " ")
    .replace(/\b(jr|sr|ii|iii|iv)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()

const entrantKey = (name: string, team: string) => `${norm(name)}|${team.trim().toUpperCase()}`

export function boutKey(r: Pick<Super32Row, "weight" | "round" | "winner" | "winnerTeam" | "loser" | "loserTeam">, gender: Gender): string {
  return [gender, r.weight, r.round.toLowerCase(), entrantKey(r.winner, r.winnerTeam), entrantKey(r.loser, r.loserTeam)].join("~")
}

export function parseFloExport(text: string): Super32Row[] {
  return dedupeBouts(parseSuper32Csv(text).filter((r) => r.winner))
}

/**
 * One row per bout. Flo exports can repeat a match (re-exports, a corrected score posted as a new
 * row), and a repeated row would count a win twice and fire a second alert. Same weight, same round
 * and the same two wrestlers (either way round) is the same bout; the last row wins, since Flo
 * appends corrections, including a reversed result.
 */
export function dedupeBouts(rows: Super32Row[]): Super32Row[] {
  const byKey = new Map<string, Super32Row>()
  for (const r of rows) {
    const pair = [norm(r.winner), norm(r.loser || "")].sort().join("~")
    const key = `${r.weight.trim()}|${r.round.trim().toLowerCase()}|${pair}`
    byKey.delete(key)
    byKey.set(key, r)
  }
  return [...byKey.values()]
}

/** Same person: names agree (aliases, nicknames, initials handled) and states agree when both are known. */
export function samePerson(a: { name: string; state?: string | null }, b: { name: string; state?: string | null }): boolean {
  if (a.state && b.state && a.state.trim().toUpperCase() !== b.state.trim().toUpperCase()) return false
  if (norm(a.name) === norm(b.name)) return true
  return namesLikelySamePerson(a.name, b.name)
}

type Component = { root: string; entrants: Set<string>; rows: Super32Row[] }

function componentsAt(rows: Super32Row[]): Component[] {
  const parent = new Map<string, string>()
  const find = (x: string): string => {
    if (!parent.has(x)) parent.set(x, x)
    let r = x
    while (parent.get(r) !== r) r = parent.get(r)!
    let y = x
    while (parent.get(y) !== r) { const n = parent.get(y)!; parent.set(y, r); y = n }
    return r
  }
  for (const r of rows) {
    const a = find(entrantKey(r.winner, r.winnerTeam))
    if (r.loser) parent.set(a, find(entrantKey(r.loser, r.loserTeam)))
  }
  const by = new Map<string, Component>()
  for (const key of parent.keys()) {
    const root = find(key)
    const c = by.get(root) ?? { root, entrants: new Set(), rows: [] }
    c.entrants.add(key)
    by.set(root, c)
  }
  for (const r of rows) by.get(find(entrantKey(r.winner, r.winnerTeam)))!.rows.push(r)
  return [...by.values()].sort((x, y) => y.entrants.size - x.entrants.size)
}

export type DivisionReport = {
  bouts: LiveBout[]
  /** One line per weight that could not be assigned with confidence. Shown on the admin page. */
  unresolved: string[]
  /** Bracket sizes chosen, for the by-eye check. */
  brackets: Array<{ gender: Gender; weight: string; entrants: number; seedsMatched: number; how: "seeds" | "largest" }>
}

/**
 * Splits the export into boys' and girls' high school bouts. `hints` are known entrants by
 * division: the seed list, and for a rehearsal on a year without seeds, last year's names.
 */
export function splitDivisions(rows: Super32Row[], hints: Array<{ gender: Gender; weight: string; name: string; state?: string | null }>): DivisionReport {
  const byWeight = new Map<string, Super32Row[]>()
  for (const r of rows) byWeight.set(r.weight, [...(byWeight.get(r.weight) ?? []), r])

  const out: DivisionReport = { bouts: [], unresolved: [], brackets: [] }
  for (const [weight, weightRows] of byWeight) {
    const wanted: Gender[] = []
    if (BOYS_WEIGHTS.includes(weight)) wanted.push("boys")
    if (GIRLS_WEIGHTS.includes(weight)) wanted.push("girls")
    if (!wanted.length) continue
    // Early in the day each bracket is still dozens of unconnected pairs and byes, so a division is
    // every piece holding its own known names, not one connected bracket (the 8:14 AM export on
    // 24 Oct 2026 had 38 bouts and no piece bigger than two wrestlers).
    const comps = componentsAt(weightRows)
    const namesOf = (c: Component) => [...c.entrants].map((k) => { const [n, t] = k.split("|"); return { name: n!, state: t! } })
    const hitsFor = (c: Component, g: Gender) => {
      const hs = hints.filter((h) => h.gender === g && h.weight === weight)
      const names = namesOf(c)
      return hs.filter((h) => names.some((n) => samePerson(n, { name: h.name, state: h.state }))).length
    }
    const taken = new Set<string>()
    for (const gender of wanted) {
      const other: Gender = gender === "boys" ? "girls" : "boys"
      const shared = wanted.length > 1
      const hs = hints.filter((h) => h.gender === gender && h.weight === weight)
      let picks: Component[] = []
      let matched = 0
      let how: "seeds" | "largest" = "seeds"
      if (hs.length) {
        for (const c of comps) {
          if (taken.has(c.root)) continue
          const mine = hitsFor(c, gender)
          if (mine > 0 && (!shared || mine >= hitsFor(c, other))) { picks.push(c); matched += mine }
        }
        const decided = weightRows.some((r) => r.loser)
        if (decided && matched < Math.min(3, hs.length)) {
          out.unresolved.push(`${gender} ${weight}: only ${matched} of ${hs.length} known names found in any bracket`)
        }
      }
      if (!picks.length) {
        const boysOnly = gender === "boys" && !shared
        if (gender === "boys" && (boysOnly || !hs.length)) {
          const largest = comps.find((c) => !taken.has(c.root) && c.entrants.size >= 4)
          picks = largest ? [largest] : []
          how = "largest"
          if (largest && !boysOnly) out.unresolved.push(`boys ${weight}: no seeds, took the largest bracket (${largest.entrants.size})`)
        } else {
          if (comps.some((c) => c.entrants.size >= 4)) out.unresolved.push(`${gender} ${weight}: no seeds to tell its bracket apart; left out`)
          continue
        }
      }
      if (!picks.length) continue
      for (const c of picks) taken.add(c.root)
      out.brackets.push({ gender, weight, entrants: picks.reduce((n, c) => n + c.entrants.size, 0), seedsMatched: matched, how })
      for (const c of picks) for (const r of c.rows) out.bouts.push({ ...r, gender, key: boutKey(r, gender) })
    }
  }
  return out
}

// ---------------------------------------------------------------------------------------------
// Rounds

const UNTIERED_TYPES = /^(FOR|M ?FOR|MFF|FF|DEF|DQ|INJ|BYE|VFO|VFA|VIN)$/i
const BONUS_TYPES = /^(MD|TF|F|FALL|VSU1?|VPO1?|VFA|VSU|VFO)$/i

export { roundOrder } from "./rounds"
import { roundOrder } from "./rounds"

const PLACEMENT: Array<[RegExp, number, number]> = [
  [/^(1st place( match)?|finals?|championship( final)?)$/i, 1, 2],
  [/^3rd place( match)?$/i, 3, 4],
  [/^5th place( match)?$/i, 5, 6],
  [/^7th place( match)?$/i, 7, 8],
]

/** Winning here guarantees a top-8 finish. Checked against Bentley Sly's 2025 path in the tests. */
const AA_CLINCH = /^(quarter-?finals?|consi of 8 #2)$/i

// ---------------------------------------------------------------------------------------------
// Tiers

export type TierContext = {
  seeds: SeedRow[]
  credentials: Credential[]
  /** Only final seeds tier wins; preliminary seeds drive the preview alone. */
  seedsFinal: boolean
}

export function seedOf(ctx: Pick<TierContext, "seeds">, gender: Gender, weight: string, name: string, team: string): number | null {
  const s = ctx.seeds.find((x) => x.gender === gender && x.weight === weight && samePerson({ name, state: team }, { name: x.name, state: x.state }))
  return s?.seed ?? null
}

export function tierWin(bout: LiveBout, ctx: TierContext): TieredWin {
  const opponentSeed = ctx.seedsFinal ? seedOf(ctx, bout.gender, bout.weight, bout.loser, bout.loserTeam) : null
  const winnerSeed = ctx.seedsFinal ? seedOf(ctx, bout.gender, bout.weight, bout.winner, bout.winnerTeam) : null
  const base = { bout, opponentSeed, winnerSeed }
  if (!bout.loser || UNTIERED_TYPES.test(bout.winType.trim())) return { ...base, tier: "win", upset: false, reasons: [] }

  const huge: string[] = []
  const big: string[] = []
  if (opponentSeed !== null) {
    if (opponentSeed <= 12) huge.push(`#${opponentSeed} seed`)
    else big.push(`#${opponentSeed} seed`)
  }
  const creds = ctx.credentials.filter(
    (c) => (!c.gender || c.gender === bout.gender) && samePerson({ name: bout.loser, state: bout.loserTeam }, { name: c.name, state: c.state }),
  )
  // Context only: listed after the seed, never a tier.
  const context: Array<{ label: string; w: number }> = []
  for (const c of creds) {
    if (c.kind === "national_rank" && c.rank && c.rank <= 30) context.push({ label: c.label, w: c.rank })
    else if (c.kind === "board_rank" && c.rank && c.rank <= 50) context.push({ label: c.label, w: 30 + c.rank })
    else if (c.kind === "event_champion") context.push({ label: c.label, w: 100 })
    else if (c.kind === "state_champion") context.push({ label: c.label, w: 110 })
    else if (c.kind === "event_all_american") context.push({ label: c.label, w: 120 })
    else if (c.kind === "state_placer") context.push({ label: c.label, w: 130 + (c.rank ?? 8) })
  }
  const rankOf = (s: string) => Number(s.match(/#(\d+)/)?.[1] ?? 99)
  huge.sort((a, b) => rankOf(a) - rankOf(b))
  big.sort((a, b) => rankOf(a) - rankOf(b))
  const tier: Tier = huge.length ? "huge" : big.length ? "big" : "win"
  const upset = opponentSeed !== null && (winnerSeed === null || winnerSeed - opponentSeed >= 4)
  const ctxLabels = [...new Set(context.sort((a, b) => a.w - b.w).map((x) => x.label))]
  return { ...base, tier, upset, reasons: [...huge, ...big, ...ctxLabels] }
}

// ---------------------------------------------------------------------------------------------
// Entrants

export type NcFilter = (name: string, team: string, gender: Gender) => boolean

/** Default NC test until profiles are linked: the Flo team code. The loader replaces it. */
export const teamIsNc: NcFilter = (_n, team) => team.trim().toUpperCase() === "NC"

export function summarizeEntrants(bouts: LiveBout[], ctx: TierContext, isNc: NcFilter = teamIsNc): EntrantSummary[] {
  const by = new Map<string, EntrantSummary>()
  const get = (name: string, team: string, b: LiveBout) => {
    const k = `${b.gender}|${b.weight}|${entrantKey(name, team)}`
    let e = by.get(k)
    if (!e) {
      e = {
        name, team, gender: b.gender, weight: b.weight,
        seed: seedOf(ctx, b.gender, b.weight, name, team),
        wins: 0, losses: 0, status: "not_started", placement: null, aaClinched: false, finalist: false,
        streak: 0, hotStreak: false, onFire: false, consiRun: false, bouts: [],
      }
      by.set(k, e)
    }
    return e
  }
  for (const b of bouts) {
    if (isNc(b.winner, b.winnerTeam, b.gender)) {
      const e = get(b.winner, b.winnerTeam, b)
      e.bouts.push({ bout: b, win: true, opponent: b.loser, opponentTeam: b.loserTeam, tiered: b.loser ? tierWin(b, ctx) : null })
    }
    if (b.loser && isNc(b.loser, b.loserTeam, b.gender)) {
      const e = get(b.loser, b.loserTeam, b)
      // A loss is never tiered, but who beat him is context: the same credentials, read for the winner.
      const asIfWon = tierWin({ ...b, winner: b.loser, winnerTeam: b.loserTeam, loser: b.winner, loserTeam: b.winnerTeam, winType: "DEC" }, ctx)
      e.bouts.push({ bout: b, win: false, opponent: b.winner, opponentTeam: b.winnerTeam, tiered: null, opponentReasons: asIfWon.reasons, lossToSeed: asIfWon.opponentSeed })
    }
  }
  for (const e of by.values()) {
    e.bouts.sort((x, y) => roundOrder(x.bout.round) - roundOrder(y.bout.round))
    const real = e.bouts.filter((x) => x.bout.loser && !/^bye$/i.test(x.bout.winType))
    e.wins = real.filter((x) => x.win).length
    e.losses = real.length - e.wins
    for (const x of e.bouts) {
      const p = PLACEMENT.find(([re]) => re.test(x.bout.round.trim()))
      if (p) {
        e.placement = x.win ? p[1] : p[2]
        if (p[1] === 1) e.finalist = true
      }
      if (x.win && AA_CLINCH.test(x.bout.round.trim())) e.aaClinched = true
      // A finalist from the moment he wins his semifinal, not only once the final is wrestled.
      if (x.win && /^semi-?finals?$/i.test(x.bout.round.trim())) e.finalist = true
    }
    if (e.placement) e.aaClinched = true
    let streak = 0
    let bonus = 0
    for (const x of real) {
      if (x.win) { streak += 1; bonus = BONUS_TYPES.test(x.bout.winType.trim()) ? bonus + 1 : 0 } else { streak = 0; bonus = 0 }
    }
    e.streak = streak
    e.hotStreak = streak >= 3
    e.onFire = bonus >= 3
    e.consiRun = streak >= 3 && e.losses >= 1
    e.status = e.placement ? "placed" : !e.bouts.length ? "not_started" : e.losses >= 2 ? "eliminated" : e.losses === 1 ? "alive_consis" : "alive"
  }
  return [...by.values()]
}

/** Seeded NC wrestlers before any bout: they appear on the board at 0-0. */
export function addUnstartedSeeds(entrants: EntrantSummary[], seeds: SeedRow[], isNc: NcFilter = teamIsNc): EntrantSummary[] {
  const out = [...entrants]
  for (const s of seeds) {
    if (!isNc(s.name, s.state, s.gender)) continue
    if (out.some((e) => e.gender === s.gender && e.weight === s.weight && samePerson(e, { name: s.name, state: s.state }))) continue
    out.push({
      name: s.name, team: s.state, gender: s.gender, weight: s.weight, seed: s.seed,
      wins: 0, losses: 0, status: "not_started", placement: null, aaClinched: false, finalist: false,
      streak: 0, hotStreak: false, onFire: false, consiRun: false, bouts: [],
    })
  }
  return out
}

// ---------------------------------------------------------------------------------------------
// Scoreboard and recap

export type Scoreboard = {
  wrestlers: number
  wins: number
  losses: number
  stillAlive: number
  aliveChamp: number
  aliveConsi: number
  huge: number
  big: number
  seededWins: number
  /** Losses to seeded opponents: with seededWins, NC's record against the seeds. */
  seededLosses: number
  allAmericans: number
  finalists: number
  winningRecords: number
}

export function scoreboard(entrants: EntrantSummary[], gender?: Gender): Scoreboard {
  const es = gender ? entrants.filter((e) => e.gender === gender) : entrants
  const wins = es.reduce((n, e) => n + e.wins, 0)
  const losses = es.reduce((n, e) => n + e.losses, 0)
  const tiered = es.flatMap((e) => e.bouts.map((b) => b.tiered).filter((t): t is TieredWin => !!t))
  const alive = (e: EntrantSummary) => e.status === "alive" || e.status === "alive_consis" || e.status === "not_started"
  return {
    wrestlers: es.length,
    wins,
    losses,
    stillAlive: es.filter(alive).length,
    aliveChamp: es.filter((e) => e.status === "alive" || e.status === "not_started").length,
    aliveConsi: es.filter((e) => e.status === "alive_consis").length,
    huge: tiered.filter((t) => t.tier === "huge").length,
    big: tiered.filter((t) => t.tier === "big").length,
    seededWins: tiered.filter((t) => t.opponentSeed !== null).length,
    seededLosses: es.reduce((n, e) => n + e.bouts.filter((b) => !b.win && b.lossToSeed != null).length, 0),
    allAmericans: es.filter((e) => e.aaClinched).length,
    finalists: es.filter((e) => e.finalist).length,
    winningRecords: es.filter((e) => e.wins > e.losses).length,
  }
}

export type Recap = {
  label: string
  wins: number
  losses: number
  seededWins: number
  huge: number
  big: number
  stillAlive: number
  topPerformance: { entrant: EntrantSummary; win: TieredWin } | null
  biggestUpset: { entrant: EntrantSummary; win: TieredWin } | null
  longestStreak: EntrantSummary | null
  notableEliminations: EntrantSummary[]
  sentence: string
}

/**
 * Uploads come every 30 minutes and weights run at different speeds (a 256 bracket is a round
 * behind a 128), so one upload spans several rounds. The label is the championship round most of
 * the upload's NC matches came from (consolation if none), never a range like "Round of 256 -
 * Round of 16"; ties go to the later round.
 */
export const ROUND_LABEL = (rounds: string[]) => {
  if (!rounds.length) return "this update"
  const count = new Map<string, number>()
  for (const r of rounds) count.set(r, (count.get(r) ?? 0) + 1)
  const pick = (pool: string[]) => [...new Set(pool)].sort((a, b) => (count.get(b)! - count.get(a)!) || roundOrder(b) - roundOrder(a))[0]
  const champ = rounds.filter((r) => /^(round of|quarter|semi|finals?$)/i.test(r))
  return pick(champ.length ? champ : rounds) ?? "this update"
}

/**
 * The recap for one import: the bouts in it that were not in the previous import. Deterministic:
 * every line is chosen by a fixed rule and the sentence is a template.
 */
export function recap(entrants: EntrantSummary[], newBoutKeys: Set<string>, gender?: Gender): Recap {
  const es = gender ? entrants.filter((e) => e.gender === gender) : entrants
  const fresh = es.flatMap((e) => e.bouts.filter((b) => newBoutKeys.has(b.bout.key) && b.bout.loser && !/^bye$/i.test(b.bout.winType)).map((b) => ({ e, b })))
  const wins = fresh.filter((x) => x.b.win)
  const tw = wins.map((x) => ({ entrant: x.e, win: x.b.tiered })).filter((x): x is { entrant: EntrantSummary; win: TieredWin } => !!x.win)
  const tierRank = (t: Tier) => (t === "huge" ? 0 : t === "big" ? 1 : 2)
  const strength = (w: TieredWin) => Number(w.reasons[0]?.match(/#(\d+)/)?.[1] ?? w.opponentSeed ?? 99)
  const top = [...tw].filter((x) => x.win.tier !== "win").sort((a, b) => tierRank(a.win.tier) - tierRank(b.win.tier) || strength(a.win) - strength(b.win))[0] ?? null
  const upsets = tw.filter((x) => x.win.upset).sort((a, b) => ((b.win.winnerSeed ?? 40) - (b.win.opponentSeed ?? 0)) - ((a.win.winnerSeed ?? 40) - (a.win.opponentSeed ?? 0)))
  const touched = new Set(fresh.map((x) => x.e))
  const longest = [...touched].filter((e) => e.streak >= 2).sort((a, b) => b.streak - a.streak)[0] ?? null
  const eliminated = [...touched].filter((e) => e.status === "eliminated" && e.seed !== null && fresh.some((x) => x.e === e && !x.b.win))
  const sb = scoreboard(es)
  const label = ROUND_LABEL(fresh.map((x) => x.b.bout.round))
  const seededWins = tw.filter((x) => x.win.opponentSeed !== null).length
  const huge = tw.filter((x) => x.win.tier === "huge").length
  const big = tw.filter((x) => x.win.tier === "big").length
  let sentence = `North Carolina went ${wins.length}-${fresh.length - wins.length} since the last update, with ${seededWins} seeded ${seededWins === 1 ? "win" : "wins"}. ${sb.stillAlive} NC ${sb.stillAlive === 1 ? "wrestler remains" : "wrestlers remain"} alive.`
  if (top && top.win.tier === "huge") sentence += ` ${top.entrant.name} (${top.entrant.weight}) beat ${top.win.reasons[0]}.`
  return {
    label, wins: wins.length, losses: fresh.length - wins.length, seededWins, huge, big, stillAlive: sb.stillAlive,
    topPerformance: top, biggestUpset: upsets[0] ?? null, longestStreak: longest, notableEliminations: eliminated, sentence,
  }
}
