import type { BracketSlotDisplay, BracketTreeDisplay } from "@/lib/bracket/types"
import { buildSingleElimTreeFromSeeds, type SeededCompetitor } from "@/lib/bracket/single-elim-layout"
import { isPlaceholderParticipant, resolveSlotLabel } from "@/lib/toc/eight-man-de-bracket"
import type { TocBracketBout, TocBracketDraw, TocBracketParticipant, TocBracketSlot } from "@/lib/toc/bracket-types"

function slotToDisplay(
  slot: TocBracketSlot,
  participantById: Map<string, TocBracketParticipant>,
): BracketSlotDisplay {
  const label = resolveSlotLabel(slot, participantById)
  const athleteId = slot.kind === "athlete" ? slot.athleteId : null
  const participant = athleteId ? participantById.get(athleteId) : null
  const isOpen =
    label.isOpen || (participant != null && isPlaceholderParticipant(participant))
  const isBye = slot.kind === "empty" && /\bbye\b/i.test(slot.label)
  const seed =
    label.seed ??
    participant?.seed ??
    (slot.kind === "empty" ? Number(slot.label.match(/Seed (\d+)/)?.[1]) || null : null)

  return {
    name: isBye ? "BYE" : isOpen ? "TBD" : label.primary,
    subtitle: isOpen ? null : label.secondary ?? participant?.school ?? null,
    seed,
    isOpen,
    photoUrl: isOpen ? null : label.photoUrl ?? participant?.photoUrl ?? null,
    competitorId: isOpen ? null : athleteId,
    reorderId: participant?.invitationId ?? null,
  }
}

function boutToMatch(
  bout: TocBracketBout,
  roundIndex: number,
  matchIndex: number,
  participantById: Map<string, TocBracketParticipant>,
): import("@/lib/bracket/types").BracketMatchDisplay {
  return {
    id: bout.id,
    roundIndex,
    matchIndex,
    roundLabel: bout.roundLabel,
    boutNumber: bout.boutNumber,
    top: slotToDisplay(bout.top, participantById),
    bottom: slotToDisplay(bout.bottom, participantById),
  }
}

/** Winners side from the adaptive TOC draw → generic single-elimination tree. */
export function tocDrawToWinnersBracketTree(draw: TocBracketDraw): BracketTreeDisplay {
  const participantById = new Map(draw.participants.map((p) => [p.athleteId, p]))
  const size = draw.bracketSize ?? (draw.format === "16-slot-de" ? 16 : 8)
  const labels = size === 16
    ? ["Round of 16", "Quarterfinals", "Winners semifinals", "Championship"]
    : ["Round 1", "Winners semifinals", "Championship"]
  const rounds = labels.map((label, roundIndex) =>
    draw.bouts
      .filter((bout) => bout.roundLabel === label)
      .sort((a, b) => a.boutNumber - b.boutNumber)
      .map((bout, matchIndex) => boutToMatch(bout, roundIndex, matchIndex, participantById)),
  )

  return {
    size,
    title: `${draw.weightClass} lbs — Winners bracket`,
    rounds: rounds.filter((round) => round.length > 0),
  }
}

/** Full field as generic 8-man tree from seeds (works with partial field). */
export function tocDrawToSeededBracketTree(draw: TocBracketDraw): BracketTreeDisplay {
  const size = draw.bracketSize ?? (draw.format === "16-slot-de" ? 16 : 8)
  const competitors: SeededCompetitor[] = draw.participants.map((p) => ({
    id: p.athleteId,
    seed: p.seed,
    name: p.name,
    subtitle: p.school,
    photoUrl: p.photoUrl,
    isPlaceholder: isPlaceholderParticipant(p),
  }))
  return buildSingleElimTreeFromSeeds(size, competitors, `${draw.weightClass} lbs`)
}

/** Consolation path: first-round losers, semifinal losers, then the third-place match. */
export function tocDrawToConsolationBracketTree(draw: TocBracketDraw): BracketTreeDisplay | null {
  const participantById = new Map(draw.participants.map((p) => [p.athleteId, p]))
  const size = draw.bracketSize ?? (draw.format === "16-slot-de" ? 16 : 8)
  const labels = size === 16
    ? ["Consolation R1", "Consolation R2", "Consolation R3", "Consolation semifinals"]
    : ["Consolation R1", "Consolation semifinals"]
  const thirdPlace = draw.bouts.find((b) => b.side === "placement" && b.roundLabel === "3rd place")
  const consolationRounds = labels.map((label, roundIndex) =>
    draw.bouts
      .filter((bout) => bout.side === "losers" && bout.roundLabel === label)
      .sort((a, b) => a.boutNumber - b.boutNumber)
      .map((bout, matchIndex) => boutToMatch(bout, roundIndex, matchIndex, participantById)),
  )

  if (consolationRounds[0]?.length === 0) return null

  const rounds = [
    ...consolationRounds,
    thirdPlace ? [boutToMatch(thirdPlace, labels.length, 0, participantById)] : [],
  ].filter((r) => r.length > 0)

  return {
    size,
    title: `${draw.weightClass} lbs — Consolation`,
    rounds,
  }
}
