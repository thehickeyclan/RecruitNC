import { TOC_EIGHT_MAN_DE_ROUND1 } from "@/lib/toc/bracket-export"
import type { TocBracketBout, TocBracketDraw, TocBracketParticipant, TocBracketSlot } from "@/lib/toc/bracket-types"
import { TOC_MAX_CONFIRMED_PER_WEIGHT } from "@/lib/toc/invitations"

function athleteSlot(athleteId: string): TocBracketSlot {
  return { kind: "athlete", athleteId }
}

function feederSlot(boutNumber: number, label: string): TocBracketSlot {
  return { kind: "feeder", boutNumber, label }
}

function bout(
  weightClass: number,
  boutNumber: number,
  roundLabel: string,
  side: TocBracketBout["side"],
  top: TocBracketSlot,
  bottom: TocBracketSlot,
): TocBracketBout {
  return {
    id: `toc-${weightClass}-b${boutNumber}`,
    boutNumber,
    roundLabel,
    side,
    top,
    bottom,
    winnerAthleteId: null,
    status: "scheduled",
  }
}

/** Standard 8-man DE bout template — R1 seeded; later slots feed from prior bouts. */
function buildEightManDeBouts(weightClass: number, bySeed: Map<number, TocBracketParticipant>): TocBracketBout[] {
  const r1 = TOC_EIGHT_MAN_DE_ROUND1.map((pair, index) => {
    const boutNumber = index + 1
    const top = bySeed.get(pair.top)
    const bottom = bySeed.get(pair.bottom)
    if (!top || !bottom) {
      throw new Error(`Missing seed ${pair.top} or ${pair.bottom} for ${weightClass} lbs bracket.`)
    }
    return bout(
      weightClass,
      boutNumber,
      "Round 1",
      "winners",
      athleteSlot(top.athleteId),
      athleteSlot(bottom.athleteId),
    )
  })

  return [
    ...r1,
    bout(
      weightClass,
      5,
      "Winners semifinals",
      "winners",
      feederSlot(1, "Winner Bout 1"),
      feederSlot(2, "Winner Bout 2"),
    ),
    bout(
      weightClass,
      6,
      "Winners semifinals",
      "winners",
      feederSlot(3, "Winner Bout 3"),
      feederSlot(4, "Winner Bout 4"),
    ),
    bout(
      weightClass,
      7,
      "Winners final",
      "winners",
      feederSlot(5, "Winner Bout 5"),
      feederSlot(6, "Winner Bout 6"),
    ),
    bout(
      weightClass,
      8,
      "Consolation R1",
      "losers",
      feederSlot(1, "Loser Bout 1"),
      feederSlot(2, "Loser Bout 2"),
    ),
    bout(
      weightClass,
      9,
      "Consolation R1",
      "losers",
      feederSlot(3, "Loser Bout 3"),
      feederSlot(4, "Loser Bout 4"),
    ),
    bout(
      weightClass,
      10,
      "Consolation R2",
      "losers",
      feederSlot(5, "Winner Bout 5"),
      feederSlot(8, "Winner Bout 8"),
    ),
    bout(
      weightClass,
      11,
      "Consolation R2",
      "losers",
      feederSlot(6, "Winner Bout 6"),
      feederSlot(9, "Winner Bout 9"),
    ),
    bout(
      weightClass,
      12,
      "Consolation semifinals",
      "losers",
      feederSlot(10, "Winner Bout 10"),
      feederSlot(11, "Winner Bout 11"),
    ),
    bout(
      weightClass,
      13,
      "Consolation final",
      "losers",
      feederSlot(7, "Loser Bout 7"),
      feederSlot(12, "Winner Bout 12"),
    ),
    bout(
      weightClass,
      14,
      "Championship",
      "placement",
      feederSlot(7, "Winner Bout 7"),
      feederSlot(13, "Winner Bout 13"),
    ),
    bout(
      weightClass,
      15,
      "3rd place",
      "placement",
      feederSlot(7, "Loser Bout 7"),
      feederSlot(13, "Loser Bout 13"),
    ),
  ]
}

export function validateBracketParticipants(participants: TocBracketParticipant[]): string | null {
  if (participants.length !== TOC_MAX_CONFIRMED_PER_WEIGHT) {
    return `Need exactly ${TOC_MAX_CONFIRMED_PER_WEIGHT} confirmed wrestlers (have ${participants.length}).`
  }

  const seeds = participants.map((p) => p.seed).sort((a, b) => a - b)
  const expected = Array.from({ length: TOC_MAX_CONFIRMED_PER_WEIGHT }, (_, i) => i + 1)
  for (let i = 0; i < expected.length; i++) {
    if (seeds[i] !== expected[i]) {
      return "Assign unique seeds 1–8 to every confirmed wrestler before locking the draw."
    }
  }

  return null
}

export function buildEightManDeDraw(
  weightClass: number,
  participants: TocBracketParticipant[],
  lockedAt: string,
): TocBracketDraw {
  const validationError = validateBracketParticipants(participants)
  if (validationError) throw new Error(validationError)

  const sorted = [...participants].sort((a, b) => a.seed - b.seed)
  const bySeed = new Map(sorted.map((p) => [p.seed, p]))

  return {
    weightClass,
    format: "8-man-de",
    lockedAt,
    participants: sorted,
    bouts: buildEightManDeBouts(weightClass, bySeed),
  }
}

export function resolveSlotLabel(
  slot: TocBracketSlot,
  participantByAthleteId: Map<string, TocBracketParticipant>,
): { primary: string; secondary?: string; seed?: number; photoUrl?: string | null } {
  if (slot.kind === "athlete") {
    const p = participantByAthleteId.get(slot.athleteId)
    if (!p) return { primary: "TBD" }
    return {
      primary: p.name,
      secondary: p.school ?? undefined,
      seed: p.seed,
      photoUrl: p.photoUrl,
    }
  }
  return { primary: slot.label }
}

export function roundOneBouts(draw: TocBracketDraw): TocBracketBout[] {
  return draw.bouts.filter((b) => b.roundLabel === "Round 1")
}

export function boutsBySide(draw: TocBracketDraw, side: TocBracketBout["side"]): TocBracketBout[] {
  return draw.bouts.filter((b) => b.side === side)
}
