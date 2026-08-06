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
  const seed =
    label.seed ??
    participant?.seed ??
    (slot.kind === "empty" ? Number(slot.label.match(/Seed (\d+)/)?.[1]) || null : null)

  return {
    name: isOpen ? "TBD" : label.primary,
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

/** Winners bracket from TOC 8-man DE draw → generic single-elim tree. */
export function tocDrawToWinnersBracketTree(draw: TocBracketDraw): BracketTreeDisplay {
  const participantById = new Map(draw.participants.map((p) => [p.athleteId, p]))
  const round1 = draw.bouts.filter((b) => b.roundLabel === "Round 1").sort((a, b) => a.boutNumber - b.boutNumber)
  const semis = draw.bouts.filter((b) => b.roundLabel === "Winners semifinals").sort((a, b) => a.boutNumber - b.boutNumber)
  const finalBout = draw.bouts.find((b) => b.roundLabel === "Championship")

  return {
    size: 8,
    title: `${draw.weightClass} lbs — Winners bracket`,
    rounds: [
      round1.map((b, i) => boutToMatch(b, 0, i, participantById)),
      semis.map((b, i) => boutToMatch(b, 1, i, participantById)),
      finalBout ? [boutToMatch(finalBout, 2, 0, participantById)] : [],
    ].filter((r) => r.length > 0),
  }
}

/** Full field as generic 8-man tree from seeds (works with partial field). */
export function tocDrawToSeededBracketTree(draw: TocBracketDraw): BracketTreeDisplay {
  const competitors: SeededCompetitor[] = draw.participants.map((p) => ({
    id: p.athleteId,
    seed: p.seed,
    name: p.name,
    subtitle: p.school,
    photoUrl: p.photoUrl,
    isPlaceholder: isPlaceholderParticipant(p),
  }))
  return buildSingleElimTreeFromSeeds(8, competitors, `${draw.weightClass} lbs`)
}

/** Consolation path: first-round losers, semifinal losers, then the third-place match. */
export function tocDrawToConsolationBracketTree(draw: TocBracketDraw): BracketTreeDisplay | null {
  const participantById = new Map(draw.participants.map((p) => [p.athleteId, p]))
  const consiR1 = draw.bouts.filter((b) => b.side === "losers" && b.roundLabel === "Consolation R1").sort((a, b) => a.boutNumber - b.boutNumber)
  const consiSf = draw.bouts.filter((b) => b.side === "losers" && b.roundLabel === "Consolation semifinals").sort((a, b) => a.boutNumber - b.boutNumber)
  const thirdPlace = draw.bouts.find((b) => b.side === "placement" && b.roundLabel === "3rd place")

  if (consiR1.length === 0) return null

  const rounds = [
    consiR1.map((b, i) => boutToMatch(b, 0, i, participantById)),
    consiSf.map((b, i) => boutToMatch(b, 1, i, participantById)),
    thirdPlace ? [boutToMatch(thirdPlace, 2, 0, participantById)] : [],
  ].filter((r) => r.length > 0)

  return {
    size: 8,
    title: `${draw.weightClass} lbs — Consolation`,
    rounds,
  }
}
