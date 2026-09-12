import type { TocBracketBout, TocBracketDraw, TocBracketSlot } from "@/lib/toc/bracket-types"

/**
 * Brackets and results, written out in sentences.
 *
 * Data Dawg could describe the tournament — dates, format, awards — and knew nothing about the
 * draw itself. On release night a wrestler in the field asked who the one seed was and was told
 * the bracket could not be found; two other people asked where to see brackets and were pointed
 * at the NCHSAA website. The facts were sitting in the locked draws the whole time.
 *
 * Formatting lives here, apart from the data fetching, so the wording and the rules about what is
 * known can be tested without a tournament running.
 */

export type BoutOutcomeText = { method: string | null; winnerScore: number | null; loserScore: number | null }

export type ResultsForAnswers = {
  winners: Record<number, string>
  outcomes: Record<number, BoutOutcomeText>
}

const EMPTY_RESULTS: ResultsForAnswers = { winners: {}, outcomes: {} }

function nameIndex(draw: TocBracketDraw): Map<string, string> {
  return new Map(draw.participants.map((p) => [p.athleteId, p.name]))
}

function seedIndex(draw: TocBracketDraw): Map<string, number> {
  return new Map(draw.participants.map((p) => [p.athleteId, p.seed]))
}

/** "3 Sheppard Homan", or just the name when a wrestler carries no seed. */
function withSeed(athleteId: string, draw: TocBracketDraw): string {
  const name = nameIndex(draw).get(athleteId)
  if (!name) return "TBD"
  const seed = seedIndex(draw).get(athleteId)
  return seed ? `${seed} ${name}` : name
}

/**
 * Who is in a slot, following winners and losers through the feeders.
 *
 * A slot reads "Winner Bout 1" until bout 1 is wrestled. Once it is, the bracket should say the
 * name — that is the whole difference between a draw and a scoreboard. Bouts only ever feed
 * forward from lower numbers, so this terminates.
 */
export function resolveSlotAthlete(
  slot: TocBracketSlot,
  draw: TocBracketDraw,
  results: ResultsForAnswers,
  seen = new Set<number>(),
): string | null {
  if (slot.kind === "athlete") return slot.athleteId
  if (slot.kind === "empty") return null
  if (seen.has(slot.boutNumber)) return null

  const source = draw.bouts.find((b) => b.boutNumber === slot.boutNumber)
  if (!source) return null

  const winner = results.winners[slot.boutNumber]
  if (!winner) return null

  if (/^winner/i.test(slot.label)) return winner

  // The loser of a bout is whoever else was in it.
  const next = new Set(seen).add(slot.boutNumber)
  const both = [
    resolveSlotAthlete(source.top, draw, results, next),
    resolveSlotAthlete(source.bottom, draw, results, next),
  ].filter((id): id is string => Boolean(id))
  return both.find((id) => id !== winner) ?? null
}

function slotText(slot: TocBracketSlot, draw: TocBracketDraw, results: ResultsForAnswers): string {
  const athleteId = resolveSlotAthlete(slot, draw, results)
  if (athleteId) return withSeed(athleteId, draw)
  if (slot.kind === "feeder") return slot.label
  if (slot.kind === "empty") return slot.label
  return "TBD"
}

/** "Fall 2:41", "Dec 7-3", or nothing when the method was never recorded. */
export function outcomeText(outcome: BoutOutcomeText | undefined): string {
  if (!outcome?.method) return ""
  const scores =
    outcome.winnerScore != null && outcome.loserScore != null ? ` ${outcome.winnerScore}-${outcome.loserScore}` : ""
  return `${outcome.method}${scores}`
}

/** One bout as a line: who beat whom, or who meets whom. */
export function boutLine(bout: TocBracketBout, draw: TocBracketDraw, results: ResultsForAnswers): string {
  const winner = results.winners[bout.boutNumber]
  const top = slotText(bout.top, draw, results)
  const bottom = slotText(bout.bottom, draw, results)

  if (!winner) return `Bout ${bout.boutNumber} · ${bout.roundLabel}: ${top} vs ${bottom} — not wrestled yet`

  const loserId = [resolveSlotAthlete(bout.top, draw, results), resolveSlotAthlete(bout.bottom, draw, results)]
    .filter((id): id is string => Boolean(id))
    .find((id) => id !== winner)
  const detail = outcomeText(results.outcomes[bout.boutNumber])
  const over = loserId ? ` def. ${withSeed(loserId, draw)}` : ""
  return `Bout ${bout.boutNumber} · ${bout.roundLabel}: ${withSeed(winner, draw)}${over}${detail ? ` (${detail})` : ""}`
}

/** The seeds, in order — the answer to "who is the 1 seed" and "what are the seeds at 141". */
export function seedListText(draw: TocBracketDraw): string {
  return [...draw.participants]
    .filter((p) => !p.isPlaceholder)
    .sort((a, b) => a.seed - b.seed)
    .map((p) => `${p.seed}. ${p.name}${p.club ? ` · ${p.club}` : ""}`)
    .join("\n")
}

/** Every bout at a weight, wrestled or not. */
export function bracketText(draw: TocBracketDraw, results: ResultsForAnswers = EMPTY_RESULTS): string {
  return [...draw.bouts]
    .sort((a, b) => a.boutNumber - b.boutNumber)
    .map((bout) => boutLine(bout, draw, results))
    .join("\n")
}

/** Who won the weight, once the championship is in. */
export function championText(draw: TocBracketDraw, results: ResultsForAnswers): string | null {
  const final = [...draw.bouts]
    .filter((b) => /championship/i.test(b.roundLabel))
    .sort((a, b) => b.boutNumber - a.boutNumber)[0]
  const winner = final ? results.winners[final.boutNumber] : undefined
  if (!winner) return null
  const detail = outcomeText(results.outcomes[final.boutNumber])
  return `${nameIndex(draw).get(winner) ?? "Unknown"} won ${draw.weightClass} lbs${detail ? ` (${detail} in the final)` : ""}.`
}

/** One wrestler's tournament: every bout they have been in, and how it went. */
export function athleteRunText(
  draw: TocBracketDraw,
  results: ResultsForAnswers,
  athleteId: string,
): { lines: string[]; wins: number; losses: number } {
  const lines: string[] = []
  let wins = 0
  let losses = 0

  for (const bout of [...draw.bouts].sort((a, b) => a.boutNumber - b.boutNumber)) {
    const inBout = [
      resolveSlotAthlete(bout.top, draw, results),
      resolveSlotAthlete(bout.bottom, draw, results),
    ].filter((id): id is string => Boolean(id))
    if (!inBout.includes(athleteId)) continue

    const winner = results.winners[bout.boutNumber]
    const opponentId = inBout.find((id) => id !== athleteId)
    const opponent = opponentId ? withSeed(opponentId, draw) : "an opponent"
    const detail = outcomeText(results.outcomes[bout.boutNumber])

    if (!winner) {
      lines.push(`Bout ${bout.boutNumber} · ${bout.roundLabel}: vs ${opponent} — not wrestled yet`)
      continue
    }
    if (winner === athleteId) {
      wins += 1
      lines.push(`Bout ${bout.boutNumber} · ${bout.roundLabel}: beat ${opponent}${detail ? ` (${detail})` : ""}`)
    } else {
      losses += 1
      lines.push(`Bout ${bout.boutNumber} · ${bout.roundLabel}: lost to ${opponent}${detail ? ` (${detail})` : ""}`)
    }
  }

  return { lines, wins, losses }
}
