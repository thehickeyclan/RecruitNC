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


/** A slot that exists only to give somebody a walkover. */
function isByeSlot(slot: TocBracketSlot): boolean {
  return slot.kind === "empty" && /\bbye\b/i.test(slot.label)
}

/**
 * Work out which bouts are actually wrestled once byes are taken out, and who ends up in them.
 *
 * A nine-wrestler weight runs on a sixteen-slot draw, so most of it is walkovers — and they
 * cascade. Bout 17 pairs the losers of two byes, so nobody is in it; bout 22 then pairs a real
 * quarterfinal loser against the winner of bout 17, so it is a walkover too. Drawn literally,
 * the consolation bracket is a wall of "Loser Bout 5" against nobody.
 *
 * Each bout resolves to one of three things: a match (two people will be there), a pass-through
 * (one person, who advances without wrestling), or nothing at all. Only matches are drawn, and
 * feeders pointing at anything else are replaced by whoever actually arrives.
 *
 * Bouts only ever feed forward from lower numbers, so the recursion terminates.
 */
type BoutOutcome =
  | { kind: "match" }
  | { kind: "pass"; slot: TocBracketSlot }
  | { kind: "none" }

function collapseWalkovers(bouts: TocBracketBout[]) {
  const byNumber = new Map(bouts.map((b) => [b.boutNumber, b]))
  const outcomes = new Map<number, BoutOutcome>()

  function resolve(slot: TocBracketSlot): TocBracketSlot | null {
    if (isByeSlot(slot)) return null
    if (slot.kind !== "feeder") return slot

    const outcome = outcomeOf(slot.boutNumber)
    if (outcome.kind === "match") return slot // real bout ahead — keep "Winner Bout 7"
    if (outcome.kind === "none") return null
    // A walkover has a winner but no loser: nobody was beaten.
    return /^winner/i.test(slot.label) ? outcome.slot : null
  }

  function outcomeOf(boutNumber: number): BoutOutcome {
    const cached = outcomes.get(boutNumber)
    if (cached) return cached

    const bout = byNumber.get(boutNumber)
    if (!bout) return { kind: "none" }

    // Marked before recursing so a malformed draw cannot loop forever.
    outcomes.set(boutNumber, { kind: "none" })
    const top = resolve(bout.top)
    const bottom = resolve(bout.bottom)

    const outcome: BoutOutcome =
      top && bottom ? { kind: "match" } : top || bottom ? { kind: "pass", slot: (top ?? bottom)! } : { kind: "none" }
    outcomes.set(boutNumber, outcome)
    return outcome
  }

  for (const bout of bouts) outcomeOf(bout.boutNumber)

  return {
    isWrestled: (boutNumber: number) => outcomeOf(boutNumber).kind === "match",
    /** The bout with byes taken out, ready to draw. */
    resolved: (bout: TocBracketBout): TocBracketBout => ({
      ...bout,
      top: resolve(bout.top) ?? bout.top,
      bottom: resolve(bout.bottom) ?? bout.bottom,
    }),
    anyCollapsed: bouts.some((b) => outcomeOf(b.boutNumber).kind !== "match"),
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
  const walkovers = collapseWalkovers(draw.bouts)
  const firstRound = labels[0]

  const rounds = labels.map((label, roundIndex) =>
    draw.bouts
      .filter((bout) => bout.roundLabel === label)
      .filter((bout) => walkovers.isWrestled(bout.boutNumber))
      .sort((a, b) => a.boutNumber - b.boutNumber)
      .map((bout, matchIndex) => {
        const resolved = walkovers.resolved(bout)
        return boutToMatch(
          {
            ...resolved,
            // "Round of 16" is the wrong name for a round of one.
            roundLabel:
              walkovers.anyCollapsed && label === firstRound ? "Preliminary" : resolved.roundLabel,
          },
          roundIndex,
          matchIndex,
          participantById,
        )
      }),
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
  // Same collapse as the winners side, and it matters more here: a bye has no loser, so a
  // nine-man consolation bracket is mostly bouts between two people who do not exist.
  const walkovers = collapseWalkovers(draw.bouts)

  const consolationRounds = labels.map((label, roundIndex) =>
    draw.bouts
      .filter((bout) => bout.side === "losers" && bout.roundLabel === label)
      .filter((bout) => walkovers.isWrestled(bout.boutNumber))
      .sort((a, b) => a.boutNumber - b.boutNumber)
      .map((bout, matchIndex) =>
        boutToMatch(walkovers.resolved(bout), roundIndex, matchIndex, participantById),
      ),
  )

  // A full field has consolation from round one; a collapsed one may start later. Only bail when
  // there is no consolation anywhere.
  if (consolationRounds.every((round) => round.length === 0)) return null

  const rounds = [
    ...consolationRounds,
    thirdPlace && walkovers.isWrestled(thirdPlace.boutNumber)
      ? [boutToMatch(walkovers.resolved(thirdPlace), labels.length, 0, participantById)]
      : [],
  ].filter((r) => r.length > 0)

  return {
    size,
    title: `${draw.weightClass} lbs — Consolation`,
    rounds,
  }
}
