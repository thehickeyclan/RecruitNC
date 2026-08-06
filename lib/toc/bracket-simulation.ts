import { isPlaceholderParticipant } from "@/lib/toc/eight-man-de-bracket"
import type { TocBracketBout, TocBracketDraw, TocBracketSlot } from "@/lib/toc/bracket-types"

export type TocSimulationPicks = Record<number, string>

function realAthleteId(draw: TocBracketDraw, slot: TocBracketSlot): string | null {
  if (slot.kind !== "athlete") return null
  const participant = draw.participants.find((row) => row.athleteId === slot.athleteId)
  return participant && !isPlaceholderParticipant(participant) ? participant.athleteId : null
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

  const sourceAthletes = simulationBoutParticipants(draw, picks, source.boutNumber, new Set(resolving).add(source.boutNumber))
  const winner = picks[source.boutNumber]
  if (sourceAthletes.length === 1) {
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
