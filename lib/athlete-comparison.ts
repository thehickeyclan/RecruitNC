/**
 * Two wrestlers, side by side, on evidence rather than opinion.
 *
 * The comparison a coach or a parent actually wants is not two columns of statistics — it is
 * "who is better, and how do you know". Three things answer that, in order:
 *
 *   1. They wrestled each other. Nothing else comes close, and the most recent meeting decides.
 *   2. They wrestled the same people. A beat Smith, B lost to Smith — that is a measurement
 *      taken through a third wrestler, and it is the only way to compare two who never met.
 *   3. Their résumés. The weakest evidence, and the only kind most sites have.
 *
 * Common opponents is the part nobody else can do, because it needs bout-level data across
 * every event. That arrived this month: NHSCA 2025 and 2026, the state brackets, the TOC, Super
 * 32 Early Entry, I-64, Journeymen and the duals.
 *
 * This states what the record shows and stops. It does not declare a winner — two wrestlers with
 * no meeting and no shared opponent cannot be separated by a computer, and saying so is more
 * use than a confident number.
 */

import { boutDateMs, holdsHeadToHeadEdge, resolvePairing } from "@/lib/head-to-head"
import { namesLikelySamePerson } from "@/lib/athlete-name-match"

export type ComparisonBout = {
  opponent: string
  /** Set when the opponent is an athlete we hold, which is what makes them comparable. */
  opponentId?: string | null
  won: boolean
  event: string | null
  date: string | null
  method?: string | null
  score?: string | null
}

export type ComparisonSide = {
  id: string
  name: string
  school?: string | null
  graduationYear?: number | null
  weight?: string | null
  /** Published rank in their own class, if they have one. */
  rank?: number | null
  record?: string | null
  statePlacements?: string[]
  nationalResults?: string[]
  bouts: ComparisonBout[]
}

export type HeadToHead = {
  /** Every meeting we hold, from the left wrestler's side (`won` = left won), newest first. */
  meetings: ComparisonBout[]
  /** All-time, every meeting on file. */
  leftWins: number
  rightWins: number
  /** The latest meeting decides a ranking argument, so it is reported separately. */
  lastMeeting: { winner: string; event: string | null; date: string | null } | null
  /**
   * Who holds the head-to-head, on the rule TOC seeding uses (lib/head-to-head.ts): only the
   * last 12 months count, and the most recent meeting in them decides. Null when every meeting
   * is older than that, so a two-year-old result never reads as today's answer.
   */
  edge: "left" | "right" | null
  summary: string
}

export type CommonOpponent = {
  /** Stable identity for the opponent: their id where we hold one, else their name. */
  key: string
  opponent: string
  leftResult: "W" | "L" | "split"
  rightResult: "W" | "L" | "split"
  /** True when one beat this opponent and the other lost to them. */
  decisive: boolean
  leftBouts: ComparisonBout[]
  rightBouts: ComparisonBout[]
}

export type Comparison = {
  left: ComparisonSide
  right: ComparisonSide
  headToHead: HeadToHead | null
  commonOpponents: CommonOpponent[]
  /** How many shared opponents each wrestler handled better. */
  commonOpponentEdge: { left: number; right: number; even: number }
  /** One sentence a person could say out loud. */
  verdict: string
}

/**
 * Who each bout's opponent is, across both wrestlers' records at once.
 *
 * An opponent's id is the identity. A bout with only a name - the season record never carries an
 * id - joins the id that name belongs to, but only when exactly one id on either side carries it;
 * two different wrestlers sharing a name stay apart by name rather than being merged. Without this
 * the same bout counted twice: Stephen Cross at the 2026 I-64 Spring Duals is in the bout table
 * with his id and in the season record by name, and both McDermott and Richards listed him twice.
 */
function opponentKeyer(bouts: ComparisonBout[]): (bout: ComparisonBout) => string {
  const idsByName = new Map<string, Set<string>>()
  const named: Array<{ name: string; id: string }> = []
  for (const b of bouts) {
    if (!b.opponentId) continue
    const name = b.opponent.trim().toLowerCase()
    if (!idsByName.has(name)) idsByName.set(name, new Set())
    idsByName.get(name)!.add(b.opponentId)
    named.push({ name: b.opponent, id: b.opponentId })
  }
  const cache = new Map<string, string>()
  return (bout) => {
    if (bout.opponentId) return `id:${bout.opponentId}`
    const name = bout.opponent.trim().toLowerCase()
    const hit = cache.get(name)
    if (hit) return hit
    let ids = idsByName.get(name)
    if (!ids) {
      ids = new Set(named.filter((n) => namesLikelySamePerson(n.name, bout.opponent)).map((n) => n.id))
    }
    const key = ids.size === 1 ? `id:${[...ids][0]}` : `name:${name}`
    cache.set(name, key)
    return key
  }
}

/** One bout per day per result: the same bout arrives from the bout table and the season record. */
function distinctBouts(bouts: ComparisonBout[]): ComparisonBout[] {
  const byDay = new Map<string, ComparisonBout>()
  const richer = (b: ComparisonBout) => Number(Boolean(b.method)) + Number(Boolean(b.score)) + Number(Boolean(b.opponentId))
  for (const b of bouts) {
    const at = boutDateMs(b.date)
    const key = at != null ? `${Math.floor(at / 86_400_000)}|${b.won}` : `${String(b.event ?? "").toLowerCase()}|${b.won}|${b.date ?? ""}`
    const held = byDay.get(key)
    if (!held || richer(b) > richer(held)) byDay.set(key, b)
  }
  return [...byDay.values()].sort((a, b) => (boutDateMs(b.date) ?? -1) - (boutDateMs(a.date) ?? -1))
}

function outcome(bouts: ComparisonBout[]): "W" | "L" | "split" {
  const won = bouts.some((b) => b.won)
  const lost = bouts.some((b) => !b.won)
  if (won && lost) return "split"
  return won ? "W" : "L"
}

/**
 * Whether a bout's opponent is a wrestler at all.
 *
 * Season records log a forfeit as an opponent called "Forfeit", a bye as "Bye", placeholder rows as
 * "Opponent1", and a team-only entry under the school's name ("Hayesville"). None is a person, and
 * "Forfeit" turned up as a common opponent between McDermott and Richards - one forfeit loss would
 * have made it a separating result.
 */
export function isRealOpponent(name: string): boolean {
  const n = name.trim()
  if (!n || !/\s/.test(n)) return false
  return !/^(forfeit|bye|unknown|tbd|n\/a|opponent\s*\d*|double forfeit|medical forfeit)\b/i.test(n)
}

/**
 * A bout is a meeting with this wrestler when its opponent id says so. Only a bout with no id
 * falls back to the name — a bout whose id names somebody else is never a namesake match.
 */
function isMeetingWith(bout: ComparisonBout, target: { id: string; name: string }): boolean {
  if (bout.opponentId) return bout.opponentId === target.id
  return namesLikelySamePerson(bout.opponent, target.name)
}

/**
 * Every meeting between the two, from both wrestlers' records.
 *
 * The same bout arrives up to three times — the left wrestler's row, the right wrestler's mirrored
 * row, and the season JSON — so meetings on the same day collapse to one. The copy carrying a
 * method or score wins, since that is the one worth reading.
 */
export function meetingsBetween(left: ComparisonSide, right: ComparisonSide): ComparisonBout[] {
  const found = [
    ...left.bouts.filter((b) => isMeetingWith(b, right)),
    ...right.bouts.filter((b) => isMeetingWith(b, left)).map((b) => ({ ...b, opponent: right.name, won: !b.won })),
  ]
  const byKey = new Map<string, ComparisonBout>()
  for (const bout of found) {
    const at = boutDateMs(bout.date)
    const key = at != null ? `day:${Math.floor(at / 86_400_000)}` : `undated:${String(bout.event ?? "").toLowerCase()}|${bout.won}`
    const held = byKey.get(key)
    const richer = (b: ComparisonBout) => Number(Boolean(b.method)) + Number(Boolean(b.score)) + Number(Boolean(b.event))
    if (!held || richer(bout) > richer(held)) byKey.set(key, bout)
  }
  return [...byKey.values()].sort((a, b) => (boutDateMs(b.date) ?? -1) - (boutDateMs(a.date) ?? -1))
}

export function buildHeadToHead(
  left: ComparisonSide,
  right: ComparisonSide,
  now: number = Date.now(),
): HeadToHead | null {
  const sorted = meetingsBetween(left, right)
  if (!sorted.length) return null
  const leftWins = sorted.filter((m) => m.won).length
  const rightWins = sorted.length - leftWins
  const latest = sorted[0]!
  const lastMeeting = {
    winner: latest.won ? left.name : right.name,
    event: latest.event,
    date: latest.date,
  }

  const pairing = resolvePairing(
    sorted.map((m) => ({ at: boutDateMs(m.date), won: m.won, summary: "" })),
    now,
  )
  const counted = pairing.wins + pairing.losses > 0
  const edge = counted ? (holdsHeadToHeadEdge(pairing) ? "left" : "right") : null

  const allTime =
    leftWins === rightWins
      ? `All-time they are even at ${leftWins}-${rightWins}.`
      : `All-time ${leftWins > rightWins ? left.name : right.name} leads ${Math.max(leftWins, rightWins)}-${Math.min(leftWins, rightWins)}.`
  const last = `${lastMeeting.winner} won the last meeting${lastMeeting.date ? ` on ${lastMeeting.date}` : ""}${lastMeeting.event ? ` at ${lastMeeting.event}` : ""}.`
  const holder = edge === "left" ? left.name : edge === "right" ? right.name : null
  const edgeLine = holder
    ? `${holder} holds the head-to-head.`
    : "Their last meeting was more than 12 months ago, so it no longer decides anything."
  return {
    meetings: sorted,
    leftWins,
    rightWins,
    lastMeeting,
    edge,
    summary: `${last} ${allTime} ${edgeLine}`,
  }
}

export function findCommonOpponents(left: ComparisonSide, right: ComparisonSide): CommonOpponent[] {
  // Each other is a head-to-head, not a common opponent; a forfeit or a bye is nobody.
  const leftBouts = left.bouts.filter((b) => isRealOpponent(b.opponent) && !isMeetingWith(b, right))
  const rightBouts = right.bouts.filter((b) => isRealOpponent(b.opponent) && !isMeetingWith(b, left))
  const keyOf = opponentKeyer([...leftBouts, ...rightBouts])
  const group = (bouts: ComparisonBout[]) => {
    const by = new Map<string, ComparisonBout[]>()
    for (const b of bouts) {
      const key = keyOf(b)
      by.set(key, [...(by.get(key) ?? []), b])
    }
    return by
  }
  const leftBy = group(leftBouts)
  const rightBy = group(rightBouts)

  const out: CommonOpponent[] = []
  for (const [key, theirsRaw] of rightBy) {
    const mineRaw = leftBy.get(key)
    if (!mineRaw) continue
    const mine = distinctBouts(mineRaw)
    const theirs = distinctBouts(theirsRaw)
    const leftResult = outcome(mine)
    const rightResult = outcome(theirs)
    // The id-carrying copy names him best; the season record's spelling is the fallback.
    const named = [...mine, ...theirs].find((b) => b.opponentId) ?? theirs[0]!
    out.push({
      key,
      opponent: named.opponent,
      leftResult,
      rightResult,
      decisive: (leftResult === "W" && rightResult === "L") || (leftResult === "L" && rightResult === "W"),
      leftBouts: mine,
      rightBouts: theirs,
    })
  }
  // The ones that separate them first; a shared win tells you nothing.
  return out.sort((a, b) => Number(b.decisive) - Number(a.decisive) || a.opponent.localeCompare(b.opponent))
}

export function compareAthletes(
  left: ComparisonSide,
  right: ComparisonSide,
  now: number = Date.now(),
): Comparison {
  const headToHead = buildHeadToHead(left, right, now)
  const commonOpponents = findCommonOpponents(left, right)
  const edge = { left: 0, right: 0, even: 0 }
  for (const c of commonOpponents) {
    if (!c.decisive) { edge.even += 1; continue }
    if (c.leftResult === "W") edge.left += 1
    else edge.right += 1
  }

  let verdict: string
  if (headToHead) {
    verdict = headToHead.summary
  } else if (edge.left !== edge.right) {
    const ahead = edge.left > edge.right ? left : right
    const behind = edge.left > edge.right ? right : left
    const score = edge.left > edge.right ? `${edge.left}-${edge.right}` : `${edge.right}-${edge.left}`
    verdict = `They have never met. Against ${commonOpponents.length} shared ${commonOpponents.length === 1 ? "opponent" : "opponents"}, ${ahead.name} did better ${score} than ${behind.name}.`
  } else if (commonOpponents.length) {
    verdict = `They have never met, and they handled their ${commonOpponents.length} shared ${commonOpponents.length === 1 ? "opponent" : "opponents"} the same way. Nothing here separates them.`
  } else {
    verdict = "They have never met and have no opponent in common. Nothing on the mat separates them — compare the résumés."
  }

  return { left, right, headToHead, commonOpponents, commonOpponentEdge: edge, verdict }
}
