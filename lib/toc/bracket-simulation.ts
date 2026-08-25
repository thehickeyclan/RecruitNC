import { isPlaceholderParticipant } from "@/lib/toc/eight-man-de-bracket"
import type { TocBracketBout, TocBracketDraw, TocBracketSlot } from "@/lib/toc/bracket-types"

export type TocSimulationPicks = Record<number, string>

function realAthleteId(draw: TocBracketDraw, slot: TocBracketSlot): string | null {
  if (slot.kind !== "athlete") return null
  const participant = draw.participants.find((row) => row.athleteId === slot.athleteId)
  return participant && !isPlaceholderParticipant(participant) ? participant.athleteId : null
}

/**
 * Could this slot ever hold a wrestler?
 *
 * The question a bye rule actually needs to ask. A bye and an unfilled seed never can. A feeder
 * usually can — but not always, and that is the case worth spelling out: "Loser Bout 1" can never
 * be filled when bout 1 is a walkover, because a walkover has no loser. That absence cascades, so
 * this has to recurse rather than look at the slot in front of it.
 *
 * At a nine-man weight it decides whether the pigtail loser reaches consolation at all.
 */
function mayEverFill(draw: TocBracketDraw, slot: TocBracketSlot, seen = new Set<number>()): boolean {
  if (slot.kind === "athlete") return realAthleteId(draw, slot) != null
  if (slot.kind === "empty") return false

  const source = draw.bouts.find((bout) => bout.boutNumber === slot.boutNumber)
  if (!source || seen.has(source.boutNumber)) return false

  const next = new Set(seen).add(source.boutNumber)
  const fillable = [source.top, source.bottom].filter((side) => mayEverFill(draw, side, next)).length

  // A winner needs one wrestler to show up; a loser needs the bout to actually be wrestled.
  return /^loser\b/i.test(slot.label) ? fillable >= 2 : fillable >= 1
}

function resolveSlotAthleteId(
  draw: TocBracketDraw,
  picks: TocSimulationPicks,
  slot: TocBracketSlot,
  resolving: Set<number>,
): string | null {
  if (slot.kind === "athlete") return realAthleteId(draw, slot)
  if (slot.kind === "empty") return null
  const source = draw.bouts.find((bout) => bout.boutNumber === slot.boutNumber)
  if (!source || resolving.has(source.boutNumber)) return null

  const nested = new Set(resolving).add(source.boutNumber)
  const topId = resolveSlotAthleteId(draw, picks, source.top, nested)
  const bottomId = resolveSlotAthleteId(draw, picks, source.bottom, nested)
  const sourceAthletes = [topId, bottomId].filter((id): id is string => Boolean(id))
  const winner = picks[source.boutNumber]

  /**
   * One wrestler present is a bye only when the other side is structurally empty. A feeder that
   * has not been decided yet means nobody has advanced — they are waiting on a result.
   *
   * Treating the two the same walked the top seed to the final untouched at a nine-man weight:
   * their quarterfinal opponent is the pigtail winner, undecided until someone picks it, so one
   * wrestler resolved at every round and each read as a walkover.
   */
  if (sourceAthletes.length === 1) {
    const missingSideIsEmpty =
      (topId == null && !mayEverFill(draw, source.top)) ||
      (bottomId == null && !mayEverFill(draw, source.bottom))
    if (!missingSideIsEmpty) return null
    return /^loser\b/i.test(slot.label) ? null : sourceAthletes[0]
  }
  if (!winner || !sourceAthletes.includes(winner)) return null
  if (/^loser\b/i.test(slot.label)) return sourceAthletes.find((id) => id !== winner) ?? null
  return winner
}

export function simulationBoutParticipants(
  draw: TocBracketDraw,
  picks: TocSimulationPicks,
  boutNumber: number,
  resolving = new Set<number>(),
): string[] {
  const bout = draw.bouts.find((row) => row.boutNumber === boutNumber)
  if (!bout) return []
  return [
    resolveSlotAthleteId(draw, picks, bout.top, resolving),
    resolveSlotAthleteId(draw, picks, bout.bottom, resolving),
  ].filter((id): id is string => Boolean(id))
}

export function sanitizeSimulationPicks(draw: TocBracketDraw, picks: TocSimulationPicks): TocSimulationPicks {
  const next = { ...picks }
  for (const bout of [...draw.bouts].sort((a, b) => a.boutNumber - b.boutNumber)) {
    const selected = next[bout.boutNumber]
    if (selected && !simulationBoutParticipants(draw, next, bout.boutNumber).includes(selected)) {
      delete next[bout.boutNumber]
    }
  }
  return next
}

export function updateSimulationPick(
  draw: TocBracketDraw,
  picks: TocSimulationPicks,
  boutNumber: number,
  athleteId: string | null,
): TocSimulationPicks {
  const next = { ...picks }
  if (athleteId == null || next[boutNumber] === athleteId) delete next[boutNumber]
  else if (simulationBoutParticipants(draw, next, boutNumber).includes(athleteId)) next[boutNumber] = athleteId
  return sanitizeSimulationPicks(draw, next)
}

function resolvedSlot(draw: TocBracketDraw, picks: TocSimulationPicks, slot: TocBracketSlot): TocBracketSlot {
  const athleteId = resolveSlotAthleteId(draw, picks, slot, new Set())
  return athleteId ? { kind: "athlete", athleteId } : slot
}

export function buildSimulatedTocDraw(draw: TocBracketDraw, picks: TocSimulationPicks): TocBracketDraw {
  const validPicks = sanitizeSimulationPicks(draw, picks)
  const bouts: TocBracketBout[] = draw.bouts.map((bout) => ({
    ...bout,
    top: resolvedSlot(draw, validPicks, bout.top),
    bottom: resolvedSlot(draw, validPicks, bout.bottom),
    winnerAthleteId: validPicks[bout.boutNumber] ?? null,
    status: validPicks[bout.boutNumber] ? "complete" : "scheduled",
  }))
  return { ...draw, bouts }
}
