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
  meetings: ComparisonBout[]
  leftWins: number
  rightWins: number
  /** The latest meeting decides a ranking argument, so it is reported separately. */
  lastMeeting: { winner: string; event: string | null; date: string | null } | null
  summary: string
}

export type CommonOpponent = {
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

/** An opponent is the same person when we hold an id for them; otherwise fall back to the name. */
function opponentKey(bout: ComparisonBout): string {
  return bout.opponentId ? `id:${bout.opponentId}` : `name:${bout.opponent.trim().toLowerCase()}`
}

function outcome(bouts: ComparisonBout[]): "W" | "L" | "split" {
  const won = bouts.some((b) => b.won)
  const lost = bouts.some((b) => !b.won)
  if (won && lost) return "split"
  return won ? "W" : "L"
}

export function buildHeadToHead(left: ComparisonSide, right: ComparisonSide): HeadToHead | null {
  const meetings = left.bouts.filter(
    (b) => (right.id && b.opponentId === right.id) || b.opponent.trim().toLowerCase() === right.name.trim().toLowerCase(),
  )
  if (!meetings.length) return null
  const sorted = [...meetings].sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")))
  const leftWins = sorted.filter((m) => m.won).length
  const rightWins = sorted.length - leftWins
  const latest = sorted[0]!
  const lastMeeting = {
    winner: latest.won ? left.name : right.name,
    event: latest.event,
    date: latest.date,
  }
  return {
    meetings: sorted,
    leftWins,
    rightWins,
    lastMeeting,
    summary: `${left.name} leads ${leftWins}-${rightWins}. ${lastMeeting.winner} won the last meeting${lastMeeting.date ? ` on ${lastMeeting.date}` : ""}${lastMeeting.event ? ` at ${lastMeeting.event}` : ""}.`,
  }
}

export function findCommonOpponents(left: ComparisonSide, right: ComparisonSide): CommonOpponent[] {
  const leftBy = new Map<string, ComparisonBout[]>()
  for (const bout of left.bouts) {
    // Each other is a head-to-head, not a common opponent.
    if (bout.opponentId && bout.opponentId === right.id) continue
    const key = opponentKey(bout)
    leftBy.set(key, [...(leftBy.get(key) ?? []), bout])
  }
  const out: CommonOpponent[] = []
  const seen = new Set<string>()
  for (const bout of right.bouts) {
    if (bout.opponentId && bout.opponentId === left.id) continue
    const key = opponentKey(bout)
    const mine = leftBy.get(key)
    if (!mine || seen.has(key)) continue
    seen.add(key)
    const theirs = right.bouts.filter((b) => opponentKey(b) === key)
    const leftResult = outcome(mine)
    const rightResult = outcome(theirs)
    out.push({
      opponent: bout.opponent,
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

export function compareAthletes(left: ComparisonSide, right: ComparisonSide): Comparison {
  const headToHead = buildHeadToHead(left, right)
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
